# O Especialista.Carros - Sistema de E-commerce

![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

Sistema completo de e-commerce para produtos de estética automotiva com integração Jadlog.

## Status do Projeto
🚧 **EM DESENVOLVIMENTO** - Versão alfa em testes

## Funcionalidades Principais

### Sistema de Vendas
- Catálogo de produtos com controle de estoque
- Carrinho de compras com cálculo de frete em tempo real
- Integração com API Jadlog para cotação de fretes
- Fluxo de pagamento PIX
- Painel administrativo para gestão

### Autenticação e Gestão
- Sistema de login para clientes e administradores
- Painel admin para produtos, pedidos e usuários
- Controle de permissões e sessões

### Logística Integrada
- Cálculo automático de frete via Jadlog
- Criação de envios após confirmação de pagamento
- Rastreamento de pedidos

## Tecnologias

### Backend
- **Framework:** Django 4.2 + Django REST Framework
- **Banco de Dados:** MariaDB
- **Autenticação:** Sistema customizado

### Frontend
- **HTML5** com templates Django
- **CSS3** com Tailwind CSS
- **JavaScript** vanilla modular

### Integrações
- **Jadlog API** - Cálculo de frete e rastreamento
- **Sistema de Pagamento** - Fluxo PIX

## Estrutura do Projeto

o-especialista-carros/
├── core/ # Aplicação principal
│ ├── integrations/ # Integrações com APIs
│ ├── services/ # Lógica de negócio
│ ├── models/ # Modelos de dados
│ ├── views/ # Controladores
│ └── templates/ # Templates frontend
└── manage.py
text


## Instalação

```bash
# Clone o repositório
git clone [url-do-repositorio]
cd o-especialista-carros

# Ambiente virtual
python -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Migrações
python manage.py migrate

# Executar
python manage.py runserver

Próximas Etapas

    Finalizar template "Meus Pedidos"

    Implementar coleta de endereço dinâmico

    Configurar credenciais Jadlog para produção

    Implementar sistema de cupons
