import pandas as pd
import requests
import time

# Google Maps Geocoding API 設定
API_KEY = 'AIzaSyDf8WyeIH00AkiOZBzTHyNwRUCnOSV_xog'
base_url = "https://maps.googleapis.com/maps/api/geocode/json"

# 定義函數：根據地址取得經緯度
def get_geocode(address):
    params = {
        'address': address,
        'key': API_KEY
    }
    response = requests.get(base_url, params=params)
    if response.status_code == 200:
        result = response.json()
        if result['status'] == 'OK':
            location = result['results'][0]['geometry']['location']
            return location['lat'], location['lng']
    return None, None

# 讀取 CSV 檔案
df = pd.read_csv('高雄市診所.csv')

# 清理縣市區名，保留區名
def clean_area_name(area):
    if isinstance(area, str):
        return area.replace('高雄市', '').replace('高雄市', '').strip()
    return area

df['區名'] = df['縣市區名'].apply(clean_area_name)

# 建立空的欄位來存放經緯度
df['緯度'] = None
df['經度'] = None

# 紀錄處理ID
processed_id = 0

# 遍歷每一行並根據地址獲取經緯度
for idx, row in df.iterrows():
    address = f"{row['縣市區名']}{row['地址']}"
    lat, lng = get_geocode(address)
    df.at[idx, '緯度'] = lat
    df.at[idx, '經度'] = lng
    processed_id += 1
    print(f"處理{processed_id}, {address}: 緯度={lat}, 經度={lng}")
    time.sleep(0.1)  # 防止請求過於頻繁

# 將結果寫入新的 CSV 檔案
df.to_csv('高雄市診所_經緯度.csv', index=False)
