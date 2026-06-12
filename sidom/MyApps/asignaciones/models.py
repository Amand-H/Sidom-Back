from django.db import models
from MyApps.usuarios.models import Domiciliario
from MyApps.solicitudes.models import Solicitud
from MyApps.core.models import TipoMaestra


class SolicitudDisponible(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="SOLI_DISP_ID"
    )

    fechaPublicacionSolicitudDisponible = models.DateTimeField(
        db_column="SOLI_DISP_FECHA_PUB",
        auto_now_add=True
    )

    fechaAceptacionSolicitudDisponible = models.DateTimeField(
        db_column="SOLI_DISP_FECHA_ACEP",
        blank=True,
        null=True
    )

    solicitud = models.ForeignKey(
        Solicitud,
        db_column="SOLI_ID",
        on_delete=models.CASCADE,
        related_name="disponibles"
    )

    domiciliario = models.ForeignKey(
        Domiciliario,
        db_column="DOMI_ID",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="solicitudes_aceptadas"
    )

    tipoEstado = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ESTADO",
        on_delete=models.PROTECT,
        related_name="estados_solicitud_disponible"
    )

    grupoSolicitudDisponible = models.IntegerField(
        db_column="SOLI_DISP_GRUPO",
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Solicitud disponible #{self.id}"

    class Meta:
        db_table = "TBL_SOLICITUDES_DISPONIBLES"
        ordering = ["-fechaPublicacionSolicitudDisponible", "-id"]
        verbose_name = "solicitud disponible"
        verbose_name_plural = "solicitudes disponibles"


class Asignacion(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="ASIG_ID"
    )

    fechaAsignacion = models.DateField(
        db_column="ASIG_FECHA",
        auto_now_add=True
    )

    solicitudDisponible = models.OneToOneField(
        SolicitudDisponible,
        db_column="SOLI_DISP_ID",
        on_delete=models.PROTECT,
        related_name="asignacion"
    )

    def __str__(self):
        return f"Asignación #{self.id}"

    class Meta:
        db_table = "TBL_ASIGNACIONES"
        ordering = ["-fechaAsignacion", "-id"]
        verbose_name = "asignación"
        verbose_name_plural = "asignaciones"
