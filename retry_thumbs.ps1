$dest = "images\thumbnails"
$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0")

$retry = @(
    @("task_10_open_close_bottle_new.jpg",  "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600"),
    @("task_22_laptop_bag_open.jpg",        "https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=600"),
    @("task_25_charger_remove.jpg",         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"),
    @("task_35_insert_cable_charger.jpg",   "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600"),
    @("task_39_connect_charging_cable.jpg", "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600")
)

foreach ($entry in $retry) {
    $filename = $entry[0]
    $url = $entry[1]
    $filepath = Join-Path $dest $filename
    try {
        $client.DownloadFile($url, $filepath)
        Write-Host "OK $filename"
    } catch {
        Write-Host "FAIL $filename - $($_.Exception.Message)"
    }
}

$client.Dispose()
Write-Host "Retry done."
