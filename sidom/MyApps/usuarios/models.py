from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from MyApps.core.models import TipoMaestra


solo_numeros = RegexValidator(
    regex=r"^\d+$",
    message="Este campo solo debe contener números."
)

placa_validator = RegexValidator(
    regex=r"^[A-Z0-9-]+$",
    message="La placa solo debe contener letras, números o guiones."
)


class Cliente(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="CLIE_ID"
    )

    identificacionCliente = models.CharField(
        db_column="CLIE_IDENTIFICACION",
        max_length=20,
        unique=True,
        validators=[solo_numeros],
        help_text="Ingrese la identificación del cliente"
    )

    nombresCliente = models.CharField(
        db_column="CLIE_NOMBRES",
        max_length=100,
        help_text="Ingrese los nombres del cliente"
    )

    apellidosCliente = models.CharField(
        db_column="CLIE_APELLIDOS",
        max_length=100,
        help_text="Ingrese los apellidos del cliente"
    )

    telefonoCliente = models.CharField(
        db_column="CLIE_TELEFONO",
        max_length=20,
        validators=[solo_numeros],
        help_text="Ingrese el teléfono del cliente"
    )

    correoCliente = models.EmailField(
        db_column="CLIE_CORREO",
        max_length=100,
        unique=True,
        help_text="Ingrese el correo del cliente"
    )

    direccionCliente = models.CharField(
        db_column="CLIE_DIRECCION",
        max_length=200,
        help_text="Ingrese la dirección del cliente"
    )

    def __str__(self):
        return f"{self.nombresCliente} {self.apellidosCliente}"

    class Meta:
        db_table = "TBL_CLIENTES"
        ordering = ["nombresCliente", "apellidosCliente"]
        verbose_name = "cliente"
        verbose_name_plural = "clientes"


class Domiciliario(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="DOMI_ID"
    )

    identificacionDomiciliario = models.CharField(
        db_column="DOMI_IDENTIFICACION",
        max_length=20,
        unique=True,
        validators=[solo_numeros],
        help_text="Ingrese la identificación del domiciliario"
    )

    nombresDomiciliario = models.CharField(
        db_column="DOMI_NOMBRES",
        max_length=100,
        help_text="Ingrese los nombres del domiciliario"
    )

    apellidosDomiciliario = models.CharField(
        db_column="DOMI_APELLIDOS",
        max_length=100,
        help_text="Ingrese los apellidos del domiciliario"
    )

    telefonoDomiciliario = models.CharField(
        db_column="DOMI_TELEFONO",
        max_length=20,
        validators=[solo_numeros],
        help_text="Ingrese el teléfono del domiciliario"
    )

    tipoVehiculoDomiciliario = models.CharField(
        db_column="DOMI_TIPO_VEHICULO",
        max_length=50,
        help_text="Ingrese el tipo de vehículo"
    )

    placaDomiciliario = models.CharField(
        db_column="DOMI_PLACA",
        max_length=20,
        unique=True,
        validators=[placa_validator],
        help_text="Ingrese la placa del vehículo"
    )

    puntajeDomiciliario = models.IntegerField(
        db_column="DOMI_PUNTAJE",
        default=100
    )

    def __str__(self):
        return f"{self.nombresDomiciliario} {self.apellidosDomiciliario}"

    class Meta:
        db_table = "TBL_DOMICILIARIOS"
        ordering = ["nombresDomiciliario", "apellidosDomiciliario"]
        verbose_name = "domiciliario"
        verbose_name_plural = "domiciliarios"


class Usuario(models.Model):
    id = models.AutoField(
        primary_key=True,
        db_column="USUA_ID"
    )

    usernameUsuario = models.CharField(
        db_column="USUA_USERNAME",
        max_length=50,
        unique=True,
        help_text="Ingrese el nombre de usuario"
    )

    passwordUsuario = models.CharField(
        db_column="USUA_PASSWORD",
        max_length=255,
        help_text="Ingrese el password del usuario"
    )

    activoUsuario = models.BooleanField(
        db_column="USUA_ACTIVO",
        default=True
    )

    tipoRol = models.ForeignKey(
        TipoMaestra,
        db_column="TIPO_ROL",
        on_delete=models.PROTECT,
        related_name="usuarios_rol"
    )

    cliente = models.ForeignKey(
        Cliente,
        db_column="CLIE_ID",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="usuarios"
    )

    domiciliario = models.ForeignKey(
        Domiciliario,
        db_column="DOMI_ID",
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name="usuarios"
    )

    def clean(self):
        if self.cliente_id and self.domiciliario_id:
            raise ValidationError("Un usuario no puede vincular cliente y domiciliario al mismo tiempo.")

    def __str__(self):
        return self.usernameUsuario

    class Meta:
        db_table = "TBL_USUARIOS"
        ordering = ["usernameUsuario"]
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
