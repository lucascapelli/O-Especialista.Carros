# start_ngrok.py
from pyngrok import ngrok
import time
import os

def start_ngrok_tunnel(port=8000):
    """Inicia túnel ngrok e retorna a URL pública"""
    print("🚀 Iniciando túnel ngrok...")
    
    # Fecha túneis existentes (opcional)
    ngrok.kill()
    
    # Cria o túnel
    public_url = ngrok.connect(port, bind_tls=True)
    
    print(f"✅ Túnel criado com sucesso!")
    print(f"📡 URL pública: {public_url}")
    print(f"🔗 URL local: http://localhost:{port}")
    print("\n⚠️  ATENÇÃO: Atualize o SITE_URL no .env com esta URL:")
    print(f"SITE_URL={public_url}")
    
    return public_url

if __name__ == "__main__":
    tunnel = start_ngrok_tunnel()
    
    print("\n🔄 Mantendo túnel aberto... (Ctrl+C para parar)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Parando ngrok...")
        ngrok.kill()