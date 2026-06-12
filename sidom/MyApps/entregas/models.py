from django.db import models
from MyApps.asignaciones.models import Asignacion
from MyApps.core.models import TipoMaestra


class HistorialEstadoEntrega(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="HIES_ID"
    )

    fechaCambioHistorial = models.DateTimeField(
        db_column="HIES_FECHA_CAMBIO",
        auto_now_add=True
    )

    observacionHistorial = models.CharField(
        db_column="HIES_OBSERVACION",
        max_length=300,
        blank=True,
        null=True,
        help_text="Ingrese una observación"
    )

    tipoEstado = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ESTADO",
        on_delete=models.PROTECT,
        related_name="estados_historial_entrega"
    )

    def __str__(self):
        return f"Historial #{self.id}"

    class Meta:
        db_table = "TBL_HISTORIAL_ESTADOS_ENTREGA"
        ordering = ["-fechaCambioHistorial", "-id"]
        verbose_name = "historial estado entrega"
        verbose_name_plural = "historial estados entrega"


class SeguimientoEntrega(models.Model):
    CUMPLIMIENTO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("A_TIEMPO", "A tiempo"),
        ("CON_RETRASO", "Con retraso"),
    ]

    id = models.AutoField(
        primary_key=True,
        db_column="SEGU_ID"
    )

    fechaEstimadaSeguimiento = models.DateTimeField(
        db_column="SEGU_FECHA_ESTIMADA",
        help_text="Ingrese la fecha estimada de entrega"
    )

    fechaRealSeguimiento = models.DateTimeField(
        db_column="SEGU_FECHA_REAL",
        blank=True,
        null=True,
        help_text="Ingrese la fecha real de entrega"
    )

    cumplimientoSeguimiento = models.CharField(
        db_column="SEGU_CUMPLIMIENTO",
        max_length=20,
        choices=CUMPLIMIENTO_CHOICES,
        default="PENDIENTE"
    )

    asignacion = models.ForeignKey(
        Asignacion,
        db_column="ASIG_ID",
        on_delete=models.PROTECT,
        related_name="seguimientos"
    )

    historialEstadoEntrega = models.ForeignKey(
        HistorialEstadoEntrega,
        db_column="HIES_ID",
        on_delete=models.PROTECT,
        related_name="seguimientos"
    )

    tiempoGarantizado = models.IntegerField(
        db_column="SEGU_TIEMPO_GARANTIZADO",
        null=True,
        blank=True
    )

    compValor = models.DecimalField(
        db_column="SEGU_COMP_VALOR",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    compFecha = models.DateField(
        db_column="SEGU_COMP_FECHA",
        null=True,
        blank=True
    )

    tipoComp = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_COMP",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="comps_seguimiento"
    )

    tipoEstadoComp = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ESTADO_COMP",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="estados_comp_seguimiento"
    )

    def save(self, *args, **kwargs):
        if self.fechaRealSeguimiento:
            self.cumplimientoSeguimiento = (
                "A_TIEMPO"
                if self.fechaRealSeguimiento <= self.fechaEstimadaSeguimiento
                else "CON_RETRASO"
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Seguimiento #{self.id}"

    class Meta:
        db_table = "TBL_SEGUIMIENTO_ENTREGA"
        ordering = ["-fechaEstimadaSeguimiento", "-id"]
        verbose_name = "seguimiento entrega"
        verbose_name_plural = "seguimientos entrega"


class Novedad(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="NOVE_ID"
    )

    fechaNovedad = models.DateField(
        db_column="NOVE_FECHA",
        auto_now_add=True
    )

    descripcionNovedad = models.CharField(
        db_column="NOVE_DESCRIPCION",
        max_length=300,
        help_text="Ingrese la descripción de la novedad"
    )

    solucionNovedad = models.CharField(
        db_column="NOVE_SOLUCION",
        max_length=300,
        blank=True,
        null=True,
        help_text="Ingrese la solución de la novedad"
    )

    seguimientoEntrega = models.ForeignKey(
        SeguimientoEntrega,
        db_column="SEGU_ID",
        on_delete=models.CASCADE,
        related_name="novedades"
    )

    tipoNovedad = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_NOVEDAD",
        on_delete=models.PROTECT,
        related_name="tipos_novedad"
    )

    tipoEstado = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ESTADO",
        on_delete=models.PROTECT,
        related_name="estados_novedad"
    )

    def __str__(self):
        return f"Novedad #{self.id}"

    class Meta:
        db_table = "TBL_NOVEDADES"
        ordering = ["-fechaNovedad", "-id"]
        verbose_name = "novedad"
        verbose_name_plural = "novedades"
