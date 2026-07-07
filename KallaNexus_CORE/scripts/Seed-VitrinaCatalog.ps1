# Crea ~30 negocios vitrina en la BD configurada (misma que la API).
# Uso local:
#   .\scripts\Seed-VitrinaCatalog.ps1
# Uso contra Supabase/prod (cuidado): define connection strings en User Secrets antes.
#
# Tras ejecutar, desactiva en Render: Kallpa__SeedCatalogDemos__Enabled=false

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$api = Join-Path $root "KallaNexus_CORE\KallaNexus_CORE"

$env:Kallpa__SeedCatalogDemos__Enabled = "true"
$env:Kallpa__SeedCatalogDemos__Count = "30"
$env:Kallpa__SeedCatalogDemos__SubdomainPrefix = "vitrina-"

Write-Host "Iniciando API solo para seed (Ctrl+C cuando veas 'CatalogDemoTenantSeeder listo' en logs)..."
Set-Location $api
dotnet run --no-launch-profile
