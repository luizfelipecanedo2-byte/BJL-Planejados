$Excel = New-Object -ComObject Excel.Application
$Workbook = $Excel.Workbooks.Open("C:\Users\Master\Desktop\Lovable\venda-f-cil-crm-main\MPF_Empresas.xlsm")
foreach($Sheet in $Workbook.Worksheets) {
    $SafeName = $Sheet.Name -replace '[^a-zA-Z0-9]', '_'
    Write-Output "Converting Sheet: $($Sheet.Name) to Sheet_$($SafeName).csv"
    $CSVPath = "C:\Users\Master\Desktop\Lovable\venda-f-cil-crm-main\Sheet_$($SafeName).csv"
    $Sheet.SaveAs($CSVPath, 6)
}
$Workbook.Close($false)
$Excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel)
Remove-Variable Excel
