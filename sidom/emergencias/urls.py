from django.urls import path
from . import views

urlpatterns = [
    path('registrar/', views.registrar_emergencia, name='registrar_emergencia'),
    path('listar/', views.listar_emergencias, name='listar_emergencias'),
]