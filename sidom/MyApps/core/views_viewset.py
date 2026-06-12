from django.db import connection
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from MyApps.core.models import TipoMaestra
from MyApps.core.serializers import TipoMaestraSerializer


class TipoMaestraViewSet(viewsets.ModelViewSet):
    queryset = TipoMaestra.objects.all()
    serializer_class = TipoMaestraSerializer

    @action(detail=False, methods=["get"], url_path="capacidad-zona")
    def capacidad_zona(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P1_CAPACIDAD_TIEMPO_REAL")
            cols = [d[0] for d in cursor.description]
            data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(data)