Write-Host "Iniciando Git Add..."
git add .

Write-Host "Iniciando Git Commit..."
git commit -m "feat: modernizacao de layout, graficos em degrade e alertas de pendencias (atualizacao)"

Write-Host "Iniciando Git Pull Rebase..."
git pull --rebase origin main

Write-Host "Iniciando Git Push..."
git push origin main
