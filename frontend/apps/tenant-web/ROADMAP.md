# Roadmap · tenant-web (Nexus Sport)

## En curso / operativo staff

- [x] Catálogo: sucursales, canchas, tarifas, medios de pago, configuración negocio
- [x] Reservas, calendario, consulta DNI, WhatsApp
- [x] Cobros por reserva (`PagoReserva`) + reportes financieros básicos
- [x] Equipo: usuarios staff y permisos por rol (API + panel)
- [x] Menú lateral filtrado por permisos del token

## Siguiente (fuera del panel staff)

- [ ] **admin-web** — consola Kallpa (plataforma): empresas, planes, soporte cross-tenant
- [ ] **Sitio público por tenant** — reserva en línea, branding por subdominio, **voucher en web** + **WhatsApp** al cliente (celular obligatorio)
- [ ] **Privacidad calendario público** — solo «Ocupado»; staff ve nombres; cliente autenticado solo sus reservas por DNI
- [ ] **DNI 123** — cliente varios en mostrador; RENIEC solo para 8 dígitos reales
- [ ] Pasarela / validación automática de vouchers
- [ ] RBAC en rutas Next (middleware) además de guards por página

## Nota

Hoy el foco es el **modo vista operativa** del club (staff). La experiencia consumidor y la vista plataforma son fases posteriores.
