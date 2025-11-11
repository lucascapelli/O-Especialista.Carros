from django.db import migrations

def criar_status_padrao(apps, schema_editor):
    StatusPedido = apps.get_model('core', 'StatusPedido')

    status_iniciais = [
        ("Pendente", "#F59E0B", 1, False),
        ("Processando", "#F97316", 2, False),
        ("Enviado", "#3B82F6", 3, False),
        ("Entregue", "#10B981", 4, True),
        ("Cancelado", "#EF4444", 5, True),
    ]

    for nome, cor, ordem, is_final in status_iniciais:
        StatusPedido.objects.get_or_create(
            nome=nome,
            defaults={"cor": cor, "ordem": ordem, "is_final": is_final}
        )

def apagar_status_padrao(apps, schema_editor):
    StatusPedido = apps.get_model('core', 'StatusPedido')
    StatusPedido.objects.filter(
        nome__in=["Pendente", "Processando", "Enviado", "Entregue", "Cancelado"]
    ).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_metodopagamento_statuspedido_transportadora_estoque_and_more'),
    ]

    operations = [
        migrations.RunPython(criar_status_padrao, apagar_status_padrao),
    ]
