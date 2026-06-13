from django.db import models

class Emergencia(models.Model):
    TIPO_CHOICES = [
        ('ACCIDENTE', 'Accidente'),
        ('ROBO', 'Robo'),
        ('EMERGENCIA', 'Emergencia médica'),
        ('OTRO', 'Otro'),
    ]
    
    asignacion_id = models.IntegerField()
    domiciliario_id = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='EMERGENCIA')
    descripcion = models.TextField(blank=True, null=True)
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    atendida = models.BooleanField(default=False)

    class Meta:
        db_table = 'emergencias'
        ordering = ['-fecha_hora']

    def __str__(self):
        return f'Emergencia {self.tipo} - {self.fecha_hora}'