"""sidom URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('api/core/', include('MyApps.core.urls_viewset')),
    path('api/usuarios/', include('MyApps.usuarios.urls_viewset')),
    path('api/solicitudes/', include('MyApps.solicitudes.urls_viewset')),
    path('api/entregas/', include('MyApps.entregas.urls_viewset')),
    path('api/tracking/', include('MyApps.tracking.urls_viewset')),
    path('api/asignaciones/', include('MyApps.asignaciones.urls_viewset')),
    path('api/emergencias/', include('emergencias.urls')),
]
