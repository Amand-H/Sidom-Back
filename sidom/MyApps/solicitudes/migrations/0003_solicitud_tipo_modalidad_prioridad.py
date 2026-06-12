from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_tipomaestra_options_and_more'),
        ('solicitudes', '0002_alter_solicitud_options_alter_solicitud_cliente_and_more'),
    ]

    operations = [
        # Las columnas TIPO_MODALIDAD y TIPO_PRIORIDAD ya existen en la BD.
        # Solo actualizamos el estado de Django sin tocar la tabla.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='solicitud',
                    name='tipoModalidad',
                    field=models.ForeignKey(
                        db_column='TIPO_MODALIDAD',
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='modalidades_solicitud',
                        to='core.tipomaestra',
                    ),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name='solicitud',
                    name='tipoProioridad',
                    field=models.ForeignKey(
                        blank=True,
                        db_column='TIPO_PRIORIDAD',
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='prioridades_solicitud',
                        to='core.tipomaestra',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
