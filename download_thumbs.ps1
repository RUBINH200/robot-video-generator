$dest = "images\thumbnails"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$thumbs = @(
    @("task_07_grip_mouse.jpg",             "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600"),
    @("task_08_open_coca_cola.jpg",          "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600"),
    @("task_09_open_close_bottle_new1.jpg",  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600"),
    @("task_10_open_close_bottle_new.jpg",   "https://images.unsplash.com/photo-1624728405619-00a1e6b7e60e?w=600"),
    @("task_11_3d_test.jpg",                 "https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=600"),
    @("task_12_open_close_bottle_001.jpg",   "https://images.unsplash.com/photo-1629367494173-c78a56567877?w=600"),
    @("task_13_rayban_case_close.jpg",       "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600"),
    @("task_14_rayban_case_open.jpg",        "https://images.unsplash.com/photo-1508296695146-257a814070b4?w=600"),
    @("task_15_lock_padlock.jpg",            "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600"),
    @("task_16_open_padlock.jpg",            "https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?w=600"),
    @("task_17_jabra.jpg",                   "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600"),
    @("task_18_opening_book2.jpg",           "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600"),
    @("task_19_opening_book.jpg",            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"),
    @("task_20_closing_book.jpg",            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600"),
    @("task_21_laptop_bag_close.jpg",        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"),
    @("task_22_laptop_bag_open.jpg",         "https://images.unsplash.com/photo-1622033842697-4f38fe1bb2c1?w=600"),
    @("task_23_folding_tshirt.jpg",          "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600"),
    @("task_24_pour_water.jpg",              "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600"),
    @("task_25_charger_remove.jpg",          "https://images.unsplash.com/photo-1601999109332-542b18dbec43?w=600"),
    @("task_26_charger_insert.jpg",          "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600"),
    @("task_27_turn_on_switch.jpg",          "https://images.unsplash.com/photo-1621887348744-6b0444f8a058?w=600"),
    @("task_28_load_staple.jpg",             "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600"),
    @("task_29_uncharging_laptop.jpg",       "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600"),
    @("task_30_charging_laptop.jpg",         "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600"),
    @("task_31_turn_off_switch.jpg",         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"),
    @("task_32_unpack_kangaro.jpg",          "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600"),
    @("task_33_unpack_staples.jpg",          "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=600"),
    @("task_34_pen_open_close.jpg",          "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600"),
    @("task_35_insert_cable_charger.jpg",    "https://images.unsplash.com/photo-1601999109332-542b18dbec43?w=600"),
    @("task_36_take_glass_box.jpg",          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"),
    @("task_37_changing_ac_batteries.jpg",   "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600"),
    @("task_38_insert_earbuds.jpg",          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600"),
    @("task_39_connect_charging_cable.jpg",  "https://images.unsplash.com/photo-1601999109332-542b18dbec43?w=600"),
    @("task_40_place_torch_batteries.jpg",   "https://images.unsplash.com/photo-1535868463750-c78d9543614f?w=600"),
    @("task_41_remove_cable_charger.jpg",    "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600"),
    @("task_42_remove_torch_batteries.jpg",  "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600")
)

$client = New-Object System.Net.WebClient
$client.Headers.Add("User-Agent", "Mozilla/5.0")
$count = 0

foreach ($entry in $thumbs) {
    $filename = $entry[0]
    $url = $entry[1]
    $filepath = Join-Path $dest $filename
    try {
        $client.DownloadFile($url, $filepath)
        $count++
        Write-Host "OK $filename"
    } catch {
        Write-Host "FAIL $filename"
    }
}

$client.Dispose()
Write-Host "Done: $count images saved to $dest"
