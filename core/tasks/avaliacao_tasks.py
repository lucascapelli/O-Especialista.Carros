# core/tasks/avaliacao_tasks.py
import hashlib
import logging
import os
import tempfile
from datetime import timedelta

from celery import shared_task
from django.core.files.storage import default_storage
from django.conf import settings
from django.utils import timezone

from core.models import Avaliacao, MidiaAvaliacao

logger = logging.getLogger(__name__)

@shared_task
def processar_moderacao_avaliacao(avaliacao_id):
    """Task para moderação automática usando ML (post-moderation)"""
    try:
        avaliacao = Avaliacao.objects.get(id=avaliacao_id)
        
        # Garantir que temos um hash_avaliacao
        if not avaliacao.hash_avaliacao:
            avaliacao.hash_avaliacao = avaliacao._compute_content_hash()
            avaliacao.save(update_fields=['hash_avaliacao'])
        
        # Verificação de conteúdo sensível (simplificado)
        # Em produção, integrar com Google Perspective API, AWS Rekognition, etc.
        palavras_sensiveis = ['spam', 'fraude', 'xxx', 'adulto']  # Lista exemplo
        
        texto = f"{avaliacao.titulo} {avaliacao.comentario}".lower()
        
        # Verificação simplificada
        contem_sensivel = any(palavra in texto for palavra in palavras_sensiveis)
        
        if contem_sensivel:
            avaliacao.status = 'pendente'
            avaliacao.save(update_fields=['status', 'updated_at'])
            logger.warning(f"Avaliação {avaliacao_id} marcada como sensível para moderação")
        
        # Verificar duplicatas pelo hash
        duplicatas = Avaliacao.objects.filter(
            hash_avaliacao=avaliacao.hash_avaliacao
        ).exclude(id=avaliacao.id)
        
        if duplicatas.exists():
            avaliacao.status = 'spam'
            avaliacao.save(update_fields=['status', 'updated_at'])
            logger.warning(f"Avaliação {avaliacao_id} marcada como spam (duplicata)")
            
    except Avaliacao.DoesNotExist:
        logger.error(f"Avaliação {avaliacao_id} não encontrada para moderação")
    except Exception as e:
        logger.error(f"Erro inesperado na moderação da avaliação {avaliacao_id}: {str(e)}")

@shared_task
def processar_midia_avaliacao(midia_id):
    """Processa mídia em background: antivírus, thumbnails, metadados (storage-agnostic)"""
    try:
        midia = MidiaAvaliacao.objects.get(id=midia_id)
        
        # 1. Calcular hash do arquivo se não existir (storage-agnostic)
        if not midia.hash_arquivo:
            with default_storage.open(midia.arquivo.name) as arquivo:
                hasher = hashlib.sha256()
                for chunk in iter(lambda: arquivo.read(8192), b''):
                    hasher.update(chunk)
                midia.hash_arquivo = hasher.hexdigest()
                midia.save(update_fields=['hash_arquivo'])
        
        # 2. Verificar duplicatas pelo hash
        duplicatas = MidiaAvaliacao.objects.filter(
            hash_arquivo=midia.hash_arquivo
        ).exclude(id=midia.id)
        
        if duplicatas.exists():
            midia.aprovado = False
            midia.motivo_rejeicao = "Conteúdo duplicado"
            midia.save(update_fields=['aprovado', 'motivo_rejeicao'])
            logger.info(f"Mídia {midia_id} marcada como duplicada")
            return
        
        # 3. Download temporário para processamento (storage-agnostic)
        with default_storage.open(midia.arquivo.name) as arquivo_original:
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(midia.arquivo.name)[1]) as tmp:
                tmp.write(arquivo_original.read())
                tmp_path = tmp.name
        
        try:
            # 4. Verificar antivírus (se configurado)
            if hasattr(settings, 'CLAMAV_SERVER'):
                if not scan_antivirus(tmp_path):
                    midia.aprovado = False
                    midia.motivo_rejeicao = "Arquivo bloqueado por antivírus"
                    midia.save(update_fields=['aprovado', 'motivo_rejeicao', 'scan_virus'])
                    logger.warning(f"Mídia {midia_id} bloqueada por antivírus")
                    return
                midia.scan_virus = True
            
            # 5. Extrair metadados (se vídeo)
            if midia.tipo == 'video':
                extract_video_metadata(midia, tmp_path)
            
            # 6. Gerar thumbnail para vídeos
            if midia.tipo == 'video' and not midia.thumbnail:
                generate_video_thumbnail(midia, tmp_path)
            
            # 7. Marcar como processado
            midia.aprovado = True
            midia.scan_conteudo = True
            midia.processado_em = timezone.now()
            midia.save(update_fields=['aprovado', 'scan_conteudo', 'processado_em'])
            
            logger.info(f"Mídia {midia_id} processada com sucesso")
            
        finally:
            # Limpeza do arquivo temporário
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        
    except MidiaAvaliacao.DoesNotExist:
        logger.error(f"Mídia {midia_id} não encontrada para processamento")
    except Exception as e:
        logger.error(f"Erro ao processar mídia {midia_id}: {str(e)}")

@shared_task
def limpar_avaliacoes_temporarias():
    """Limpa avaliações temporárias e mídias antigas"""
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Avaliações rejeitadas/spam com mais de 30 dias
    deleted_count = Avaliacao.objects.filter(
        status__in=['rejeitado', 'spam'],
        created_at__lt=cutoff_date
    ).delete()[0]
    
    # Mídias não aprovadas com mais de 30 dias
    deleted_midia_count = MidiaAvaliacao.objects.filter(
        aprovado=False,
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Limpeza concluída: {deleted_count} avaliações e {deleted_midia_count} mídias removidas")

def scan_antivirus(file_path):
    """Scanner de antivírus usando ClamAV (storage-agnostic)"""
    try:
        import pyclamd
        cd = pyclamd.ClamdNetworkSocket(
            host=settings.CLAMAV_SERVER,
            port=3310,
            timeout=30
        )
        result = cd.scan_file(file_path)
        return result is None  # None = sem vírus
    except ImportError:
        logger.warning("pyclamd não instalado, pulando scan antivírus")
        return True
    except Exception as e:
        logger.error(f"Erro no scan antivírus: {e}")
        return True  # Permite se scanner falhar

def extract_video_metadata(midia, file_path):
    """Extrai metadados de vídeo usando ffmpeg"""
    try:
        import ffmpeg
        probe = ffmpeg.probe(file_path)
        video_stream = next(
            (stream for stream in probe['streams'] if stream['codec_type'] == 'video'),
            None
        )
        
        if video_stream:
            midia.resolucao = f"{video_stream.get('width', 0)}x{video_stream.get('height', 0)}"
            if 'duration' in video_stream:
                midia.duracao_video = timedelta(seconds=float(video_stream['duration']))
            midia.mimetype = probe.get('format', {}).get('format_name', '')
            
    except ImportError:
        logger.warning("ffmpeg-python não instalado, pulando extração de metadados")
    except Exception as e:
        logger.error(f"Erro ao extrair metadados de vídeo: {e}")

def generate_video_thumbnail(midia, file_path):
    """Gera thumbnail para vídeo"""
    try:
        from moviepy.editor import VideoFileClip
        import tempfile
        
        clip = VideoFileClip(file_path)
        # Pega frame no meio do vídeo
        frame_time = clip.duration / 2
        
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            clip.save_frame(tmp.name, t=frame_time)
            
            # Salva thumbnail usando default_storage
            with open(tmp.name, 'rb') as f:
                # Usa o mesmo sistema de upload da mídia original
                from core.models.avaliacoes import upload_to_avaliacao
                thumbnail_name = upload_to_avaliacao(midia, f'thumb_{midia.id}.jpg')
                midia.thumbnail.save(thumbnail_name, f, save=False)
            
            os.unlink(tmp.name)
        
        clip.close()
            
    except ImportError:
        logger.warning("moviepy não instalado, pulando geração de thumbnail")
    except Exception as e:
        logger.error(f"Erro ao gerar thumbnail: {e}")