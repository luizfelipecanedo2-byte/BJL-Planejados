$Excel = New-Object -ComObject Excel.Application
$Workbook = $Excel.Workbooks.Open("C:\Users\Master\Desktop\Lovable\venda-f-cil-crm-main\MPF_Empresas.xlsm")
$Workbook.SaveAs("C:\Users\Master\Desktop\Lovable\venda-f-cil-crm-main\MPF_Empresas.csv", 6)
$Workbook.Close($false)
$Excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel)
Remove-Variable Excel
