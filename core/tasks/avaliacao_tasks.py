from celery import shared_task
from django.core.files.storage import default_storage
from django.conf import settings
import boto3
import magic
import hashlib
import logging
from core.models import Avaliacao, MidiaAvaliacao
from datetime import timedelta
from django.utils import timezone
import subprocess
import os

logger = logging.getLogger(__name__)

@shared_task
def processar_moderacao_avaliacao(avaliacao_id):
    """Task para moderação automática usando ML (post-moderation)"""
    try:
        avaliacao = Avaliacao.objects.get(id=avaliacao_id)
        
        # Verificação de conteúdo sensível (simplificado)
        # Em produção, integrar com Google Perspective API, AWS Rekognition, etc.
        palavras_sensiveis = ['spam', 'fraude', 'xxx', 'adulto']  # Lista exemplo
        
        texto = f"{avaliacao.titulo} {avaliacao.comentario}".lower()
        
        # Verificação simplificada
        contem_sensivel = any(palavra in texto for palavra in palavras_sensiveis)
        
        if contem_sensivel:
            avaliacao.status = 'pendente'
            avaliacao.save()
            
            # Notificar moderadores
            logger.warning(f"Avaliação {avaliacao_id} marcada como sensível para moderação")
        
        # Verificar duplicatas pelo hash
        duplicatas = Avaliacao.objects.filter(
            hash_avaliacao=avaliacao.hash_avaliacao
        ).exclude(id=avaliacao.id)
        
        if duplicatas.exists():
            avaliacao.status = 'spam'
            avaliacao.save()
            logger.warning(f"Avaliação {avaliacao_id} marcada como spam (duplicata)")
            
    except Avaliacao.DoesNotExist:
        logger.error(f"Avaliação {avaliacao_id} não encontrada para moderação")

@shared_task
def processar_midia_avaliacao(midia_id):
    """Processa mídia em background: antivírus, thumbnails, metadados"""
    try:
        midia = MidiaAvaliacao.objects.get(id=midia_id)
        
        # 1. Verificar duplicatas pelo hash
        duplicatas = MidiaAvaliacao.objects.filter(
            hash_arquivo=midia.hash_arquivo
        ).exclude(id=midia.id)
        
        if duplicatas.exists():
            midia.aprovado = False
            midia.motivo_rejeicao = "Conteúdo duplicado"
            midia.save()
            return
        
        # 2. Verificar antivírus (se configurado)
        if hasattr(settings, 'CLAMAV_SERVER'):
            if not scan_antivirus(midia.arquivo.path):
                midia.aprovado = False
                midia.motivo_rejeicao = "Arquivo bloqueado por antivírus"
                midia.save()
                return
        
        # 3. Extrair metadados
        if midia.tipo == 'video':
            extract_video_metadata(midia)
        
        # 4. Gerar thumbnail para vídeos
        if midia.tipo == 'video' and not midia.thumbnail:
            generate_video_thumbnail(midia)
        
        # 5. Marcar como processado
        midia.aprovado = True
        midia.scan_conteudo = True
        midia.scan_virus = True
        midia.processado_em = timezone.now()
        midia.save()
        
        logger.info(f"Mídia {midia_id} processada com sucesso")
        
    except Exception as e:
        logger.error(f"Erro ao processar mídia {midia_id}: {str(e)}")

@shared_task
def limpar_avaliacoes_temporarias():
    """Limpa avaliações temporárias e mídias antigas"""
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Avaliações rejeitadas/spam com mais de 30 dias
    Avaliacao.objects.filter(
        status__in=['rejeitado', 'spam'],
        created_at__lt=cutoff_date
    ).delete()
    
    # Mídias não aprovadas com mais de 30 dias
    MidiaAvaliacao.objects.filter(
        aprovado=False,
        created_at__lt=cutoff_date
    ).delete()
    
    logger.info("Limpeza de avaliações temporárias concluída")

def scan_antivirus(file_path):
    """Scanner de antivírus usando ClamAV"""
    try:
        import pyclamd
        cd = pyclamd.ClamdNetworkSocket(
            host=settings.CLAMAV_SERVER,
            port=3310,
            timeout=30
        )
        result = cd.scan_file(file_path)
        return result is None  # None = sem vírus
    except Exception as e:
        logger.error(f"Erro no scan antivírus: {e}")
        return True  # Permite se scanner falhar

def extract_video_metadata(midia):
    """Extrai metadados de vídeo usando ffmpeg"""
    try:
        import ffmpeg
        probe = ffmpeg.probe(midia.arquivo.path)
        video_stream = next(
            (stream for stream in probe['streams'] if stream['codec_type'] == 'video'),
            None
        )
        
        if video_stream:
            midia.resolucao = f"{video_stream.get('width', 0)}x{video_stream.get('height', 0)}"
            if 'duration' in video_stream:
                midia.duracao_video = timedelta(seconds=float(video_stream['duration']))
            midia.mimetype = probe.get('format', {}).get('format_name', '')
            
    except Exception as e:
        logger.error(f"Erro ao extrair metadados de vídeo: {e}")

def generate_video_thumbnail(midia):
    """Gera thumbnail para vídeo"""
    try:
        from moviepy.editor import VideoFileClip
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            clip = VideoFileClip(midia.arquivo.path)
            # Pega frame no meio do vídeo
            frame_time = clip.duration / 2
            clip.save_frame(tmp.name, t=frame_time)
            clip.close()
            
            # Salva thumbnail
            with open(tmp.name, 'rb') as f:
                midia.thumbnail.save(f'thumb_{midia.id}.jpg', f, save=False)
            
            os.unlink(tmp.name)
            
    except Exception as e:
        logger.error(f"Erro ao gerar thumbnail: {e}")