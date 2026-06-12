from django.db import models
from MyApps.usuarios.models import Cliente
from MyApps.core.models import TipoMaestra


class Solicitud(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="SOLI_ID"
    )

    fechaSolicitud = models.DateField(
        db_column="SOLI_FECHA",
        auto_now_add=True,
        help_text="Fecha de creación de la solicitud"
    )

    descripcionSolicitud = models.CharField(
        db_column="SOLI_DESCRIPCION",
        max_length=300,
        help_text="Ingrese la descripción de la solicitud"
    )

    direccionRecogidaSolicitud = models.CharField(
        db_column="SOLI_DIR_RECOGIDA",
        max_length=200,
        blank=True,
        null=True,
        help_text="Ingrese la dirección de recogida"
    )

    direccionEntregaSolicitud = models.CharField(
        db_column="SOLI_DIR_ENTREGA",
        max_length=200,
        help_text="Ingrese la dirección de entrega"
    )

    cliente = models.ForeignKey(
        Cliente,
        db_column="CLIE_ID",
        on_delete=models.PROTECT,
        related_name="solicitudes"
    )

    tipoZona = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ZONA",
        on_delete=models.PROTECT,
        related_name="zonas_solicitud"
    )

    tipoServicio = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_SERVICIO",
        on_delete=models.PROTECT,
        related_name="servicios_solicitud"
    )

    tipoEstado = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ESTADO",
        on_delete=models.PROTECT,
        related_name="estados_solicitud"
    )

    tipoMotivoRechazo = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_MOTIVO_RECHAZO",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="motivos_rechazo_solicitud"
    )

    tipoModalidad = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_MODALIDAD",
        on_delete=models.PROTECT,
        related_name="modalidades_solicitud"
    )

    tipoProioridad = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_PRIORIDAD",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="prioridades_solicitud"
    )

    def __str__(self):
        return f"Solicitud #{self.id} - {self.cliente}"

    class Meta:
        db_table = "TBL_SOLICITUDES"
        ordering = ["-fechaSolicitud", "-id"]
        verbose_name = "solicitud"
        verbose_name_plural = "solicitudes"
