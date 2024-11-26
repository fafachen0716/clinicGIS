// mapInit.js
import 'https://cdn.jsdelivr.net/npm/ol@v9.2.4/dist/ol.js';

// 等待 DOM 加載完成
document.addEventListener('DOMContentLoaded', initMap);


function initMap() {

    // 預設台北市的中心座標 (經度, 緯度)
    var taipeiCenter = [121.5654, 25.0330]; // 台北市信義區經緯度
    taipeiCenter = ol.proj.fromLonLat(taipeiCenter); // 轉換經緯度為地圖投影座標

    // 建立地圖圖層
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(), // OpenStreetMap 標準
                title: 'osm-standard',
                visible: false
            }),
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' // CartoDB Dark Matter
                }),
                title: 'cartodb-dark',
                visible: false
            }),
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' // Google 衛星圖層
                }),
                title: 'google-satellite',
                visible: false
            }),
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png' // CartoDB Light
                }),
                title: 'cartodb-positron',
                visible: true
            })
        ],
        view: new ol.View({
            center: taipeiCenter,
            zoom: 12 // 預設縮放比例
        })
    });
    // 定義繪圖層和繪圖源
    let isDrawing = false; // 用來判斷是否在繪圖模式
    var source = new ol.source.Vector();
    var vectorLayer = new ol.layer.Vector({
        source: source,
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.9)'
            }),
            stroke: new ol.style.Stroke({
                color: 'red',
                width: 2
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: 'red'
                })
            })
        })
    });
    map.addLayer(vectorLayer);

    // 初始化繪圖工具變量
    var draw;
    var measureTooltipElement;
    var measureTooltip;
    var listener;

    // 添加測量工具提示
    function createMeasureTooltip() {
        if (measureTooltipElement) {
            measureTooltipElement.parentNode.removeChild(measureTooltipElement);
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        measureTooltip = new ol.Overlay({
            element: measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center'
        });
        map.addOverlay(measureTooltip);
    }

    // 繪圖交互功能
    function addInteraction(type) {
        draw = new ol.interaction.Draw({
            source: source,
            type: type
        });

        // 當用戶開始繪製時，顯示測量結果
        draw.on('drawstart', function (evt) {
            createMeasureTooltip();
            var sketch = evt.feature;

            // 監聽繪製過程
            listener = sketch.getGeometry().on('change', function (event) {
                var geom = event.target;
                var output;
                var tooltipCoord;

                if (geom instanceof ol.geom.Polygon) {
                    output = formatArea(geom); // 顯示面積
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof ol.geom.LineString) {
                    output = formatLength(geom); // 顯示距離
                    tooltipCoord = geom.getLastCoordinate();
                }
                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord);
            });
        });

        // 完成繪圖
        draw.on('drawend', function (evt) {
            measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
            measureTooltip.setOffset([0, -7]);
            measureTooltipElement = null;
            ol.Observable.unByKey(listener); // 停止監聽

            // 保留測量提示
            createMeasureTooltip(); // 確保新提示框在下一次繪製時不覆蓋已有的提示
        });

        map.addInteraction(draw);
    }

    // 格式化距離
    function formatLength(line) {
        var length = ol.sphere.getLength(line);
        var output;
        if (length > 1000) {
            output = (length / 1000).toFixed(2) + ' km';
        } else {
            output = length.toFixed(2) + ' m';
        }
        return output;
    }

    // 格式化面積
    function formatArea(polygon) {
        var area = ol.sphere.getArea(polygon);
        var output;
        if (area > 10000) {
            //output = (area / 10000).toFixed(2) + ' ha';
            output = (area/1000000).toFixed(2) + ' km²';
        } else {
            output = (area/1000000).toFixed(2) + ' km²';
        }
        return output;
    }

    // 點、線、面的繪圖按鈕
    document.getElementById('draw-point').onclick = function () {
        map.removeInteraction(draw);
        isDrawing = true; // 進入繪圖模式
        addInteraction('Point');
    };
    document.getElementById('draw-line').onclick = function () {
        map.removeInteraction(draw);
        isDrawing = true; // 進入繪圖模式
        addInteraction('LineString');
    };
    document.getElementById('draw-polygon').onclick = function () {
        map.removeInteraction(draw);
        isDrawing = true; // 進入繪圖模式
        addInteraction('Polygon');
    };

    // 新增「結束繪圖」按鈕的功能
    document.getElementById('end-drawing').onclick = function () {
        map.removeInteraction(draw); // 停止繪圖互動
        isDrawing = false; // 離開繪圖模式
    };
    // 清除繪圖功能
    document.getElementById('clear-drawings').onclick = function () {
        isDrawing = false; // 離開繪圖模式

        source.clear();
        map.getOverlays().clear(); // 清除測量提示
        // 清除圓形圖層
        if (circleLayer) {
            map.removeLayer(circleLayer); // 移除圓形圖層
            circleLayer = null; // 重置圓形圖層變數
        }

        };

    //半徑畫圓
    let radiusInKm = 1; // 預設半徑為1公里
    let circleLayer; // 用來存儲圓形圖層
    document.getElementById('radius-input').addEventListener('input', function (event) {
        radiusInKm = parseFloat(event.target.value);
    });
    document.getElementById('draw-circle').onclick = function () {
        isDrawing = true; // 進入繪圖模式
        map.once('click', function (evt) {
            const center = evt.coordinate; // 使用者點擊的地圖座標
            const radiusInMeters = radiusInKm * 1000; // 將公里轉換為米

            // 建立圓形圖形
            const circle = new ol.geom.Circle(center, radiusInMeters);
            const circleFeature = new ol.Feature(circle);

            const vectorSource = new ol.source.Vector({
                features: [circleFeature]
            });

            // 建立圖層
            circleLayer = new ol.layer.Vector({
                source: vectorSource,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'blue',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(0, 0, 255, 0.1)'
                    })
                })
            });

            map.addLayer(circleLayer); // 加入圖層
            //等待1秒
            setTimeout(function () {
                isDrawing = false; // 離開繪圖模式
            }, 1000);

        });
    };


    // 圖層切換功能
    document.querySelectorAll('input[name="baseLayer"]').forEach(function(element) {
        element.addEventListener('change', function() {
            var selectedLayer = this.value;
            map.getLayers().forEach(function(layer) {
                // 只切換底圖圖層的顯示狀態
                if (layer instanceof ol.layer.Tile) {
                    layer.setVisible(layer.get('title') === selectedLayer);
                }
            });
        });
    });

    function addIncomeLayer(cityName, geojsonUrl) {
        var incomeLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: geojsonUrl, // GeoJSON 檔案路徑
                format: new ol.format.GeoJSON()
            }),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#319FD3',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 255, 255, 0.1)'  // 你可以根據不同城市自訂顏色
                })
            })
        });
        
        incomeLayer.set('name', cityName);  // 為圖層設定名稱以便後續管理
        map.addLayer(incomeLayer);
    }

    //跳轉到不同縣市
    var cityCenters = {
        taipei: ol.proj.fromLonLat([121.5654, 25.0330]), // 台北市
        newtaipei: ol.proj.fromLonLat([121.4633, 25.0173]), // 新北市
        taoyuan: ol.proj.fromLonLat([121.3015, 24.9930]), // 桃園市
        taichung: ol.proj.fromLonLat([120.6736, 24.1477]), // 台中市
        tainan: ol.proj.fromLonLat([120.2270, 22.9999]), // 台南市
        kaohsiung: ol.proj.fromLonLat([120.3014, 22.6273]) // 高雄市
    };
    document.querySelectorAll('.jump-to-city').forEach(button => {
        button.onclick = function () {
            var city = this.getAttribute('data-city'); // 取得城市的資料
            var center = cityCenters[city]; // 取得城市中心座標
            
            map.getView().animate({
                center: center,
                zoom: 12, // 設定想要的縮放比例
                duration: 1000 // 動畫持續時間（毫秒）
            });
        };
    });

    // 添加台北市的收入圖層
    addIncomeLayer('Taipei', 'tpe_income4.geojson');

    // 添加新北市的收入圖層
    addIncomeLayer('New Taipei', 'newtpe_income.geojson');

    // 添加台中市的收入圖層
    addIncomeLayer('Taichung', 'taichung_income2.geojson');

    // 添加台南市的收入圖層
    addIncomeLayer('Tainan', 'tainan_income.geojson');

    // 添加高雄市的收入圖層
    addIncomeLayer('Kaohsiung', 'kaohsiung_income.geojson');

    // 添加桃園市的收入圖層
    addIncomeLayer('Taoyuan', 'taoyuan_income3.geojson');

    /// 隨機生成顏色的函數
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    // 定義50種鮮艷顏色的數組
    const vibrantColors = [
        '#FF5733', // 鮮紅
        '#FF8C00', // 橘色
        '#FFD700', // 金色
        '#32CD32', // 翠綠色
        '#4682B4', // 鋼藍色
        '#6A5ACD', // 杜鵑紫
        '#FF69B4', // 粉紅色
        '#CD5C5C', // 印度紅
        '#20B2AA', // 淡海洋綠
        '#FF4500', // 橙紅色
        '#8B008B', // 深紫紅色
        '#7FFF00', // 查特留斯綠
        '#FFA07A', // 淺鮭紅
        '#FF6347', // 番茄色
        '#FFDAB9', // 桃色
        '#98FB98', // 淺綠色
        '#FF1493', // 深粉紅色
        '#FFB6C1', // 淺粉紅色
        '#AFEEEE', // 淺青色
        '#B22222', // 鮮紅色
        '#5F9EA0', // 醜藍
        '#4B0082', // 靛青色
        '#D2691E', // 巧克力色
        '#8FBC8F', // 深綠色
        '#FFD700', // 金黃色
        '#FFC0CB', // 粉紅色
        '#FF7F50', // 珊瑚色
        '#6495ED', // 玉米花藍
        '#3CB371', // 中海洋綠
        '#FF4500', // 橙紅色
        '#ADFF2F', // 草綠色
        '#7B68EE', // 濃藍色
        '#483D8B', // 深藍色
        '#2E8B57', // 海洋綠
        '#6B8E23', // 橄欖綠
        '#F0E68C', // 卡其色
        '#DDA0DD', // 鬱金香紫
        '#FF1493', // 深粉紅
        '#8B4513', // 駝色
        '#B8860B', // 金色
        '#D8BFD8', // 鬱金香紫
        '#E6E6FA', // 薰衣草紫
        '#DCDCDC', // 鉛灰色
        '#A0522D', // 鮮土色
        '#7B68EE', // 濃藍色
        '#F08080', // 淺紅色
        '#20B2AA', // 淡海洋綠
        '#FF6347', // 番茄色
        '#FFEFD5', // 魚肚白
        '#98FB98', // 淺綠色
        '#FFE4E1', // 莫蘭迪色
        '#FFB6C1', // 淺粉紅色
        '#ADD8E6', // 淺藍色
        '#F5F5DC', // 米色
        '#FAFAD2', // 淡金色
        '#DDA0DD'  // 鬱金香紫
    ];

    var vectorSources = {}; // 儲存各行政區的資料來源
    var vectorLayers = {}; // 儲存各行政區的診所圖層
    var specialtyColors = {}; // 儲存科別顏色的對應表
    let colorIndex = 0; // 用來記錄當前顏色索引
    let specialtySet = new Set(); // 儲存科別的集合
    function loadClinicData(cityName, csvFilePath) {

        
        fetch(csvFilePath)
            .then(response => response.text())
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        let districtCounts = {}; // 儲存每個行政區的診所數量

                        results.data.forEach(row => {
                            let name = row['機構名稱'];
                            if(name === undefined){
                                return;
                            }
                            let phone = row['電話'];
                            let address = row['地址'];
                            let district = row['區名'];
                            let doctor = row['A醫師'];
                            let TCM_doctor = row['B中醫師'];
                            let dentist = row['C牙醫師'];
                            let pharmacist = row['D藥師'];
                            let specialties = row['科別'] ? row['科別'].split(',').map(function(specialty) {
                                return specialty.trim();
                            }).filter(function(specialty) {
                                return specialty !== '';
                            }) : [];
                            let latitude = parseFloat(row['緯度']);
                            let longitude = parseFloat(row['經度']);
                            
                            if (!isNaN(latitude) && !isNaN(longitude)) {
                                let coordinates = ol.proj.fromLonLat([longitude, latitude]);

                                if (!vectorSources[district]) {
                                    vectorSources[district] = new ol.source.Vector();
                                    vectorLayers[district] = new ol.layer.Vector({
                                        source: vectorSources[district],
                                        visible: false,
                                        title: cityName + ' - ' + district
                                    });
                                    map.addLayer(vectorLayers[district]);
                                }

                                specialties.forEach(function(specialty) {
                                    specialtySet.add(specialty);

                                    if (!specialtyColors[specialty]) {
                                        specialtyColors[specialty] = vibrantColors[colorIndex % vibrantColors.length];
                                        colorIndex++;
                                    }

                                    let marker = new ol.Feature({
                                        geometry: new ol.geom.Point(coordinates),
                                        name: name,
                                        phone: phone,
                                        address: address,
                                        doctor: doctor,
                                        TCM_doctor: TCM_doctor,
                                        dentist: dentist,
                                        pharmacist: pharmacist,
                                        specialties: specialty,
                                    });

                                    let fillColor = specialtyColors[specialty];
                                    marker.setStyle(new ol.style.Style({
                                        image: new ol.style.Circle({
                                            radius: 6,
                                            fill: new ol.style.Fill({
                                                color: fillColor
                                            }),
                                            stroke: new ol.style.Stroke({
                                                color: 'white',
                                                width: 1.5
                                            })
                                        })
                                    }));

                                    vectorSources[district].addFeature(marker);
                                });

                                if (!districtCounts[district]) {
                                    districtCounts[district] = 0;
                                }
                                districtCounts[district]++;
                            }
                        });

                        // 動態生成科別的 HTML 欄位
                        let specialtyContainer = document.getElementById('specialty-container');
                        specialtySet.forEach(function(specialty) {
                            let label = document.createElement('label');

                            let checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'specialty-toggle';
                            checkbox.setAttribute('data-specialty', specialty);
                            checkbox.checked = true;

                            label.appendChild(checkbox);
                            label.appendChild(document.createTextNode(' ' + specialty));
                            label.appendChild(document.createElement('span')).className = 'clinic-count';

                            specialtyContainer.appendChild(label);
                        });

                        // 更新行政區診所數量顯示
                        document.querySelectorAll('.district-toggle').forEach(function(element) {
                            let district = element.getAttribute('data-district');
                            if (districtCounts[district]) {
                                element.nextElementSibling.innerHTML = 
                                ' (' + districtCounts[district] + '間診所)';
                            }
                        });

                        // 根據選擇顯示或隱藏行政區的診所
                        document.querySelectorAll('.district-toggle').forEach(function(element) {
                            element.addEventListener('change', function() {
                                let district = this.getAttribute('data-district');
                                if (vectorLayers[district]) {
                                    vectorLayers[district].setVisible(this.checked);
                                }
                            });
                        });

                            // 根據選擇顯示或隱藏特定科別的診所
                            document.querySelectorAll('.specialty-toggle').forEach(function(element) {
                                element.addEventListener('change', function() {
                                    let specialty = this.getAttribute('data-specialty');
                                    let checked = this.checked;
                                    for (let district in vectorSources) {
                                        vectorSources[district].getFeatures().forEach(function(feature) {
                                            if (feature.get('specialties').includes(specialty)) {
                                                feature.setStyle(new ol.style.Style({
                                                    image: new ol.style.Circle({
                                                        radius: 6,
                                                        fill: new ol.style.Fill({
                                                            color: checked ? specialtyColors[specialty] : 'rgba(0, 0, 0, 0)'
                                                        }),
                                                        stroke: new ol.style.Stroke({
                                                            color: 'white',
                                                            width: 1.5
                                                        })
                                                    })
                                                }));
                                            }
                                        });
                                    }
                                });
                            });

                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    // 加載新北市的診所資料
    loadClinicData('新北市', '新北市診所_經緯度.csv');

    // 加載台北市的診所資料
    loadClinicData('台北市', '台北市診所_經緯度.csv');

    // 加載高雄市的診所資料
    loadClinicData('高雄市', '高雄市診所_經緯度.csv');

    // 加載高雄市的診所資料
    loadClinicData('臺南市', '臺南市診所_經緯度.csv');
    // 加載高雄市的診所資料
    loadClinicData('臺中市', '臺中市診所_經緯度.csv');
    // 加載高雄市的診所資料
    loadClinicData('桃園市', '桃園市診所_經緯度.csv');
    //加入醫學中心，星形標記
    fetch('醫學中心.csv')
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    results.data.forEach(row => {
                        let name = row['機構名稱'];
                        let phone = row['電話'];
                        let address = row['地址'];
                        let latitude = parseFloat(row['緯度']);
                        let longitude = parseFloat(row['經度']);

                        let district = row['區名'];
                        let doctor = row['A醫師'];
                        let TCM_doctor = row['B中醫師'];
                        let dentist = row['C牙醫師'];
                        let pharmacist = row['D藥師'];
                        let specialties = ['醫學中心',];

                        if (!isNaN(latitude) && !isNaN(longitude)) {
                            let coordinates = ol.proj.fromLonLat([longitude, latitude]);

                            let marker = new ol.Feature({
                                geometry: new ol.geom.Point(coordinates),
                                geometry: new ol.geom.Point(coordinates),
                                name: name,
                                phone: phone,
                                address: address,
                                doctor: doctor,
                                TCM_doctor: TCM_doctor,
                                dentist: dentist,
                                pharmacist: pharmacist,
                                specialties: specialties,

                            });
                            console.log(marker);
                            marker.setStyle(new ol.style.Style({
                                image: new ol.style.RegularShape({
                                    fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.8)' }),
                                    stroke: new ol.style.Stroke({ color: 'black', width: 1 }),
                                    points: 5,
                                    radius: 10,
                                    radius2: 4,
                                    angle: 0
                                })
                            }));

                            let vectorSource = new ol.source.Vector({
                                features: [marker]
                            });
                            let vectorLayer = new ol.layer.Vector({
                                source: vectorSource
                            });
                            map.addLayer(vectorLayer);
                        }
                    });
                }
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
        



    // 建立 Overlay 來顯示 popup
    var popup = new ol.Overlay({
        element: document.getElementById('popup'),
        autoPan: false,

    });


    map.addOverlay(popup);

    var closer = document.getElementById('popup-closer');

    // Add click event listener to the closer element
    closer.onclick = function() {
        console.log(document.getElementById('popup').style.display);
        document.getElementById('popup').style.display = 'none';
        infodisplay = 1;
        closer.blur();

        return false;
    };


    // 顯示 popup 的內容
    map.on('singleclick', function (evt) {
        if (isDrawing) {
            // 如果正在繪圖，阻止彈出效果
            return;
        }

        var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
        });

        if (feature) {
            var properties = feature.getProperties();
        
            // 判斷是否是診所
            if (properties.name && properties.phone && properties.address) {
                // 診所的 popup
                var coordinates = feature.getGeometry().getCoordinates();
                popup.setPosition(coordinates);
                var specialties = feature.get('specialties');
                console.log(specialties);
                var content = '<b>' + feature.get('name') + '</b><br>' +
                '☎️電話: ' + feature.get('phone') + '<br>' ;
                content+= '📓科別: '+feature.get('specialties');
                // Remove the last element from the list
                //specialties.pop(); 
                /*
                specialties.forEach(function(specialty) {
                    content += '' + specialty + ' ';
                });
                */
                if (feature.get('doctor') !== '0') {
                    content += '<br>💉醫師: ' + feature.get('doctor') + '位';
                }
                if (feature.get('TCM_doctor') !== '0') {
                    content += '<br>🌿中醫師: ' + feature.get('TCM_doctor') + '位';
                }
                if (feature.get('dentist') !== '0') {
                    content += '<br>🦷牙醫師: ' + feature.get('dentist') + '位';
                }
                if (feature.get('pharmacist') !== '0') {
                    content += '<br>💊藥師: ' + feature.get('pharmacist') + '位';
                }
                content += '<br>地址: ' + feature.get('address');
        
            

                document.getElementById('popup-content').innerHTML = content;
                document.getElementById('popup').style.display = 'block';
                infodisplay = 0;
            } else {
                // 如果是 GeoJSON 區域
                var geometry = feature.getGeometry();
                coordinates = ol.extent.getCenter(geometry.getExtent());
                console.log(coordinates);
                // 計算該區域內的診所數量
                var clinicCount = 0;
                for (var district in vectorSources) {
                    vectorSources[district].getFeatures().forEach(function(clinicFeature) {
                        var clinicCoords = clinicFeature.getGeometry().getCoordinates();
                        if (geometry.intersectsCoordinate(clinicCoords)) {
                            clinicCount++;
                        }
                    });
                }

                // 顯示區域內診所數量和其他區域屬性
                var population = properties['POPULATION'] || 0;
                var maleToFemaleRatio = (properties['POPULATION_M'] !== 0) ? 
                    (properties['POPULATION_M'] / properties['POPULATION_F']).toFixed(2) : 'N/A';
                //轉成數字先
                
                var ElderIndex = (properties['ElderIndex'] ? Number(properties['ElderIndex']).toFixed(2) : "暫無資料");

                console.log(ElderIndex);
                console.log(properties);
                popup.setPosition(coordinates);
        
                var content = '<b>🗺️' +
                            properties['VILLAGE'] + '<br>' +
                            '<hr>'+
                            '<b>🗿人口數:</b> ' + properties['POPULATION'] + '人<br>' +
                            '<b>💰所得平均數:</b> ' + Math.round(properties['2022台灣所得data_平均數'] / 10) + '萬<br>' +
                            '<b>💰中位數:</b> ' + Math.round(properties['2022台灣所得data_中位數'] / 10) + '萬<br>' +
                            '<b>👫男女比例:</b> ' + maleToFemaleRatio + '<br>' +
                            '<b>🏥診所數量:</b> ' + clinicCount + ' 間診所'+ '<br>' +
                            '<b>🎯一間診所服務</b> ' + (clinicCount > 0 ? Math.round(properties['POPULATION'] / clinicCount) + '人<br>' : '無法計算<br>')+
                            '<b>👶🏻幼年人口:</b> ' + (properties['POPULATION_14-'] ? properties['POPULATION_14-'] + '人' : '暫無資料') + '<br>' +
                            '<b>🧓🏻老年人口:</b> ' + (properties['POPULATION_65+'] ? properties['POPULATION_65+'] + '人' : '暫無資料') + '<br>' +
                            '<hr>' +
                            '<b>老化指數:</b> ' + (properties['ElderIndex'] ? properties['ElderIndex'] : '暫無資料');


                document.getElementById('popup-content').innerHTML = content;
                document.getElementById('popup').style.display = 'block';
                infodisplay = 0;
            }
        } else {
            document.getElementById('popup').style.display = 'none';
            infodisplay = 1;
        }
    });


            // 根據圖層名稱來查找圖層
    function getLayerByName(name) {
        // 取得地圖中的所有圖層
        let layers = map.getLayers().getArray();

        // 根據名稱尋找匹配的圖層
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].get('name') === name) {
                return layers[i];  // 返回找到的圖層
            }
        }
        return null;  // 若未找到則返回 null
    }


    // 根據不同的數據設定樣式
    function getStyleByDataset(feature, dataset, cityData) {
        let value, ranges, colors;

        // 根據 dataset 設定不同的級距範圍與對應顏色
        if (dataset === 'average-income') {
            console.log('average-income');
            value = feature.get(cityData.averageIncomeField);
            ranges = cityData.averageIncomeRanges;
            colors = cityData.averageIncomeColors;
            clearColorLegend();
            showColorLegend(ranges, colors);
        } else if (dataset === 'median-income') {
            console.log('median-income');
            value = feature.get(cityData.medianIncomeField);
            ranges = cityData.medianIncomeRanges;
            colors = cityData.medianIncomeColors;
            clearColorLegend();
            showColorLegend(ranges, colors);
        } else if (dataset === 'population') {
            console.log('population');
            value = feature.get(cityData.populationField);
            ranges = cityData.populationRanges;
            colors = cityData.populationColors;
            clearColorLegend();
            showColorLegend(ranges, colors);
        } else if (dataset === 'elder-index') {
            console.log('elder-index');
            value = feature.get(cityData.elderIndexField);
            ranges = cityData.elderIndexRanges;
            colors = cityData.elderIndexColors;
            clearColorLegend();
            showColorLegend(ranges, colors);
        } else {
            value = 0;
            ranges = [0];
            colors = ['rgba(255, 255, 255, 0.1)'];
            clearColorLegend();
            showColorLegend(ranges, colors);
        }

        // 根據級距設定顏色
        let color = getColorForValue(value, ranges, colors);

        return new ol.style.Style({
            fill: new ol.style.Fill({
                color: color
            }),
            stroke: new ol.style.Stroke({
                color: 'black',
                width: 0.3
            })
        });
    }

    // 根據 value 落在哪個範圍來選擇對應的顏色
    function getColorForValue(value, ranges, colors) {
        for (let i = 0; i < ranges.length; i++) {
            if (value < ranges[i]) {
                return colors[i];
            }
        }
        // 若超過最大範圍，使用最後一個顏色
        return colors[colors.length - 1];
    }

    // 更新圖層樣式的函式
    function updateLayerStyle(dataset, incomeLayer, cityData) {
        incomeLayer.setStyle(function (feature) {
            return getStyleByDataset(feature, dataset, cityData);
        });
    }

    // 顯示色票的函數
    function showColorLegend(ranges, colors) {
        const legendDiv = document.getElementById('color-legend');
        legendDiv.innerHTML = ''; // 先清空之前的內容
        ranges.forEach((range, index) => {
            const colorBox = document.createElement('div');
            colorBox.style.display = 'inline-block';
            colorBox.style.width = '30px';
            colorBox.style.height = '20px';
            colorBox.style.backgroundColor = colors[index];
            colorBox.style.marginRight = '5px';

            const label = document.createElement('span');
            label.innerText = range;

            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.marginBottom = '5px';
            wrapper.appendChild(colorBox);
            wrapper.appendChild(label);

            legendDiv.appendChild(wrapper);
        });
    }

    // 清除色票的函數
    function clearColorLegend() {
        const legendDiv = document.getElementById('color-legend');
        legendDiv.innerHTML = ''; // 清除色票區域的所有內容
    }

    // 設置事件監聽器的函式
    function setupDataToggleListeners(incomeLayer, cityData) {
        document.querySelectorAll('.data-toggle').forEach(function (element) {
            element.addEventListener('change', function () {
                // 取消其他勾選框的選擇
                document.querySelectorAll('.data-toggle').forEach(function (el) {
                    if (el !== element) {
                        el.checked = false;
                    }
                });

                // 取得目前選中的 dataset
                let dataset = this.getAttribute('data-dataset');

                // 更新圖層
                updateLayerStyle(dataset, incomeLayer, cityData);

                // 檢查是否有任何 checkbox 被勾選
                let anyChecked = false;
                document.querySelectorAll('.data-toggle').forEach(function (el) {
                    if (el.checked) {
                        anyChecked = true;
                    }
                });

                // 如果沒有任何 checkbox 被勾選，清除圖層（根據需求添加清除邏輯）
                if (!anyChecked) {
                    // 清除圖層樣式或其他邏輯
                }
            });
        });
    }
    // 取得全選/全不選按鈕和科別容器
    let selectAllSpecialties = document.getElementById('select-all-specialties');
    let specialtyContainer = document.getElementById('specialty-container');

    // 根據選擇顯示或隱藏特定科別的診所
    function updateClinicStyles() {
        // 這裡遍歷所有的 specialty-toggle checkbox，並更新對應的地圖點樣式
        document.querySelectorAll('.specialty-toggle').forEach(function(element) {
            let specialty = element.getAttribute('data-specialty');
            let checked = element.checked;
            
            for (let district in vectorSources) {
                vectorSources[district].getFeatures().forEach(function(feature) {
                    if (feature.get('specialties').includes(specialty)) {
                        feature.setStyle(new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 6,
                                fill: new ol.style.Fill({
                                    color: checked ? specialtyColors[specialty] : 'rgba(0, 0, 0, 0)' // 根據勾選狀態設置顏色
                                }),
                                stroke: new ol.style.Stroke({
                                    color: 'white',
                                    width: 1.5
                                })
                            })
                        }));
                    }
                });
            }
        });
    }

    // 每次 checkbox 改變時更新對應的樣式
    document.querySelectorAll('.specialty-toggle').forEach(function(element) {
        element.addEventListener('change', function() {
            updateClinicStyles(); // 重新更新所有樣式
        });
    });

    // 全選/全不選按鈕的事件監聽器
    selectAllSpecialties.addEventListener('change', function() {
        let checkboxes = specialtyContainer.querySelectorAll('.specialty-toggle');
        let isChecked = selectAllSpecialties.checked; // 確認全選按鈕的勾選狀態

        // 將所有 checkbox 設置為與全選按鈕一致的狀態
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = isChecked;
        });

        console.log(isChecked ? '已全選' : '已全不選'); // Debug: 確認全選或全不選的狀態

        // 更新地圖上的樣式
        updateClinicStyles(); // 全選/全不選後重新設定所有樣式
    });



    // 台北市資料配置
    const taipeiData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [500, 1000, 1500, 2000],
        averageIncomeColors: [
            'rgba(255, 235, 190, 0.6)',
            'rgba(255, 204, 128, 0.6)',
            'rgba(255, 153, 85, 0.6)',
            'rgba(255, 77, 77, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [300, 600, 900, 1200],
        medianIncomeColors: [
            'rgba(230, 245, 208, 0.6)',
            'rgba(170, 220, 130, 0.6)',
            'rgba(110, 200, 80, 0.6)',
            'rgba(50, 150, 30, 0.6)'
        ],
        populationField: 'POPULATION',
        populationRanges: [1000, 3000, 5000, 10000],
        populationColors: [
            'rgba(190, 235, 255, 0.6)',
            'rgba(128, 204, 255, 0.6)',
            'rgba(85, 153, 255, 0.6)',
            'rgba(77, 77, 255, 0.6)'
        ],
        elderIndexField: 'ElderIndex',
        elderIndexRanges: [0.1, 0.4, 0.7, 1.0, 1.3, 1.6, 1.8, 2.0],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.6)',  // 淡藍色
            'rgba(170, 220, 255, 0.6)',  // 更深的淡藍色
            'rgba(128, 204, 255, 0.6)',  // 中間藍色
            'rgba(85, 153, 255, 0.6)',   // 中度藍色
            'rgba(77, 130, 255, 0.6)',   // 深藍色
            'rgba(64, 100, 230, 0.6)',   // 更深藍色
            'rgba(51, 80, 200, 0.6)',    // 接近深藍
            'rgba(40, 60, 180, 0.6)'     // 最深藍
        ]

    };

    // 新北市資料配置
    const newTaipeiData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [400, 800, 1200, 1600],
        averageIncomeColors: [
            'rgba(255, 240, 180, 0.6)',
            'rgba(255, 210, 120, 0.6)',
            'rgba(255, 160, 90, 0.6)',
            'rgba(255, 90, 60, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [250, 500, 750, 1000],
        medianIncomeColors: [
            'rgba(230, 250, 200, 0.6)',
            'rgba(180, 220, 140, 0.6)',
            'rgba(120, 180, 90, 0.6)',
            'rgba(60, 140, 50, 0.6)'
        ],
        populationField: 'POPULATION',
        populationRanges: [500, 2000, 4000, 8000],
        populationColors: [
        'rgba(190, 235, 255, 0.6)',
        'rgba(128, 204, 255, 0.6)',
        'rgba(85, 153, 255, 0.6)',
        'rgba(77, 77, 255, 0.6)'
        ],   
        elderIndexRanges: [0.1],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.01)',  // 淡藍色
        ]

        
    };

    const taichungData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [400, 900, 1300, 1700],
        averageIncomeColors: [
            'rgba(250, 240, 200, 0.6)',
            'rgba(250, 200, 150, 0.6)',
            'rgba(250, 150, 100, 0.6)',
            'rgba(250, 100, 50, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [200, 500, 800, 1100],
        medianIncomeColors: [
            'rgba(230, 250, 210, 0.6)',
            'rgba(180, 240, 150, 0.6)',
            'rgba(130, 190, 100, 0.6)',
            'rgba(80, 130, 50, 0.6)'
        ],
        populationField: 'POPULATION',
        populationRanges: [1500, 3500, 5500, 9000],
        populationColors: [
            'rgba(210, 240, 255, 0.6)',
            'rgba(150, 200, 255, 0.6)',
            'rgba(100, 150, 255, 0.6)',
            'rgba(50, 100, 255, 0.6)'
        ],
        elderIndexField: 'ElderIndex',
        elderIndexRanges: [0.1, 0.3, 0.5, 0.8],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.6)',
            'rgba(128, 204, 255, 0.6)',
            'rgba(85, 153, 255, 0.6)',
            'rgba(77, 77, 255, 0.6)'
        ]
    };
    const tainanData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [300, 800, 1200, 1600],
        averageIncomeColors: [
            'rgba(255, 235, 200, 0.6)',
            'rgba(255, 195, 150, 0.6)',
            'rgba(255, 145, 100, 0.6)',
            'rgba(255, 95, 50, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [250, 550, 850, 1150],
        medianIncomeColors: [
            'rgba(235, 245, 215, 0.6)',
            'rgba(185, 225, 165, 0.6)',
            'rgba(135, 175, 115, 0.6)',
            'rgba(85, 125, 65, 0.6)'
        ],
        populationField: '人口數_人口數',
        populationRanges: [1000, 3000, 5000, 7000],
        populationColors: [
            'rgba(200, 235, 255, 0.6)',
            'rgba(140, 195, 255, 0.6)',
            'rgba(90, 145, 255, 0.6)',
            'rgba(40, 95, 255, 0.6)'
        ],
        elderIndexField: 'ElderIndex',
        elderIndexRanges: [0.1, 0.3, 0.5, 0.8],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.6)',
            'rgba(128, 204, 255, 0.6)',
            'rgba(85, 153, 255, 0.6)',
            'rgba(77, 77, 255, 0.6)'
        ]
    };
    const kaohsiungData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [450, 950, 1400, 1800],
        averageIncomeColors: [
            'rgba(255, 245, 190, 0.6)',
            'rgba(255, 215, 130, 0.6)',
            'rgba(255, 175, 80, 0.6)',
            'rgba(255, 135, 40, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [300, 600, 900, 1200],
        medianIncomeColors: [
            'rgba(240, 255, 215, 0.6)',
            'rgba(190, 235, 165, 0.6)',
            'rgba(140, 195, 115, 0.6)',
            'rgba(90, 145, 65, 0.6)'
        ],
        populationField: 'POPULATION',
        populationRanges: [1200, 2500, 4000, 6500],
        populationColors: [
            'rgba(220, 245, 255, 0.6)',
            'rgba(160, 205, 255, 0.6)',
            'rgba(110, 155, 255, 0.6)',
            'rgba(60, 105, 255, 0.6)'
        ],
        elderIndexField: 'ElderIndex',
        elderIndexRanges: [0.1, 0.3, 0.5, 0.8],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.6)',
            'rgba(128, 204, 255, 0.6)',
            'rgba(85, 153, 255, 0.6)',
            'rgba(77, 77, 255, 0.6)'
        ]
    };
    const taoyuanData = {
        averageIncomeField: '2022台灣所得data_平均數',
        averageIncomeRanges: [500, 1000, 1500, 2000],
        averageIncomeColors: [
            'rgba(255, 240, 190, 0.6)',
            'rgba(255, 210, 140, 0.6)',
            'rgba(255, 170, 90, 0.6)',
            'rgba(255, 120, 40, 0.6)'
        ],
        medianIncomeField: '2022台灣所得data_中位數',
        medianIncomeRanges: [300, 700, 1100, 1400],
        medianIncomeColors: [
            'rgba(235, 255, 210, 0.6)',
            'rgba(185, 235, 160, 0.6)',
            'rgba(135, 195, 110, 0.6)',
            'rgba(85, 145, 60, 0.6)'
        ],
        populationField: 'POPULATION',
        populationRanges: [1500, 4000, 7000, 10000],
        populationColors: [
            'rgba(210, 240, 255, 0.6)',
            'rgba(150, 205, 255, 0.6)',
            'rgba(100, 155, 255, 0.6)',
            'rgba(50, 105, 255, 0.6)'
        ],
        elderIndexField: 'ElderIndex',
        elderIndexRanges: [0.1, 0.4, 0.7, 1.0, 1.3, 1.6, 1.8, 2.0],
        elderIndexColors: [
            'rgba(190, 235, 255, 0.6)',  // 淡藍色
            'rgba(170, 220, 255, 0.6)',  // 更深的淡藍色
            'rgba(128, 204, 255, 0.6)',  // 中間藍色
            'rgba(85, 153, 255, 0.6)',   // 中度藍色
            'rgba(77, 130, 255, 0.6)',   // 深藍色
            'rgba(64, 100, 230, 0.6)',   // 更深藍色
            'rgba(51, 80, 200, 0.6)',    // 接近深藍
            'rgba(40, 60, 180, 0.6)'     // 最深藍
        ]

    };


    const cityDataMap = {
        'Taipei': taipeiData,
        'New Taipei': newTaipeiData,
        'Taichung': taichungData,
        'Tainan': tainanData,
        'Kaohsiung': kaohsiungData,
        'Taoyuan': taoyuanData
    };



    // 使用函式設置樣式和監聽器
    // 呼叫台北市的圖層
    let taipeiLayer = getLayerByName('Taipei');
    // 例如：查找名為 "Taipei" 的圖層
    if (taipeiLayer) {
        console.log('找到圖層: ', taipeiLayer);
    } else {
        console.log('未找到圖層');
    }
    if (taipeiLayer) {
        // 更新台北市圖層的樣式
        updateLayerStyle('average-income', taipeiLayer, taipeiData);
        setupDataToggleListeners(taipeiLayer, taipeiData);
    }
    let newTaipeiLayer = getLayerByName('New Taipei');
    // 例如：查找名為 "New Taipei" 的圖層
    if (newTaipeiLayer) {
        console.log('找到圖層: ', newTaipeiLayer);
    } else {
        console.log('未找到圖層');
    }
    if (newTaipeiLayer) {
        // 更新台北市圖層的樣式
        updateLayerStyle('average-income', newTaipeiLayer, newTaipeiData);
        setupDataToggleListeners(newTaipeiLayer, newTaipeiData);
    }

    let kaohsiungLayer = getLayerByName('Kaohsiung');
    // 例如：查找名為 "New Taipei" 的圖層
    if (kaohsiungLayer) {
        console.log('找到圖層: ', kaohsiungLayer);
    } else {
        console.log('未找到圖層');
    }
    if (kaohsiungLayer) {
        // 更新台北市圖層的樣式
        updateLayerStyle('average-income', kaohsiungLayer, kaohsiungData);
        setupDataToggleListeners(kaohsiungLayer, kaohsiungData);
    }

    let tainanLayer = getLayerByName('Tainan');
    // 例如：查找名為 "New Taipei" 的圖層
    if (tainanLayer) {
        console.log('找到圖層: ', tainanLayer);
    } else {
        console.log('未找到圖層');
    }
    if (tainanLayer) {
        // 更新台北市圖層的樣式
        updateLayerStyle('average-income', tainanLayer, tainanData);
        setupDataToggleListeners(tainanLayer, tainanData);
    }

    let taichungLayer = getLayerByName('Taichung');
    // 例如：查找名為 "Taichung" 的圖層
    if (taichungLayer) {
        console.log('找到圖層: ', taichungLayer);
    } else {
        console.log('未找到圖層');
    }
    if (taichungLayer) {
        // 更新台中市圖層的樣式
        updateLayerStyle('average-income', taichungLayer, taichungData);
        setupDataToggleListeners(taichungLayer, taichungData);
    }

    let taoyuanLayer = getLayerByName('Taoyuan');
    // 例如：查找名為 "Taoyuan" 的圖層
    if (taoyuanLayer) {
        console.log('找到圖層: ', taoyuanLayer);
    } else {
        console.log('未找到圖層');
    }
    if (taoyuanLayer) {
        // 更新桃園市圖層的樣式
        updateLayerStyle('average-income', taoyuanLayer, taoyuanData);
        setupDataToggleListeners(taoyuanLayer, taoyuanData);
    }

            // 取得 info 的 DOM 元素
        const info = document.getElementById('info');
        var infodisplay = 1;
        // 當滑鼠移動時處理 hover 事件
        map.on('pointermove', function(event) {
            if (infodisplay === 0) {
                return;
            }
            // 取得滑鼠位置對應的特徵
            map.forEachFeatureAtPixel(event.pixel, function(feature) {
                const districtName = feature.get('VILLAGE');  // 假設 GeoJSON 屬性包含 'name' 字段表示里名稱
                
                if (districtName) {
                    // 顯示里名稱
                    info.style.display = 'block';
                    info.innerHTML = `${districtName}`;
                    
                    // 將 info 位置設置為滑鼠位置
                    info.style.left = `${event.pixel[0] + 1}px`;
                    info.style.top = `${event.pixel[1] + 1}px`;
                }
            }, {
                hitTolerance: 0  // 增加點擊範圍以提高用戶體驗
            });
        });
        
        // 當滑鼠離開地圖範圍時，隱藏 info
        map.getViewport().addEventListener('mouseout', function() {
            info.style.display = 'none';
        });
        
    // 診所搜尋功能
    var clinicList = document.getElementById('clinic-list');
    var clinicSearch = document.getElementById('clinic-search');
    var addedClinics = new Set(); // 用來追蹤已添加的診所，避免重複

        // 定義讀取CSV檔案並將診所資料加入選單的函數
        function loadClinicsFromCSV(csvFiles) {
            csvFiles.forEach(file => {
                fetch(file)
                    .then(response => response.text())
                    .then(csvText => {
                        console.log('CSV data loaded from', file); // Debug: 確認CSV檔案已加載
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: function(results) {
                                console.log('Parsed CSV data from', file, results.data); // Debug: 顯示解析後的數據
                                results.data.forEach(row => {
                                    let name = row['機構名稱'];
                                    let district = row['區名'];
                                    let latitude = parseFloat(row['緯度']);
                                    let longitude = parseFloat(row['經度']);

                                    if (!isNaN(latitude) && !isNaN(longitude) && !addedClinics.has(name)) {
                                        let option = document.createElement('option');
                                        option.value = name; // 將診所名稱設為選項的值
                                        option.text = name + ' (' + district + ')';
                                        option.setAttribute('data-lat', latitude);   // 存儲緯度
                                        option.setAttribute('data-lon', longitude);  // 存儲經度
                                        clinicList.appendChild(option);
                                        addedClinics.add(name); // 將診所名稱加入追蹤集合中，避免重複
                                        // console.log('Added option:', option.text); // Debug: 確認選項被添加
                                    }
                                });
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error loading CSV from', file, error); // Debug: 加載CSV出錯
                    });
            });
        }

        // 診所搜尋功能 (可以自定義搜尋邏輯)
        clinicSearch.addEventListener('input', function() {
            let keyword = clinicSearch.value.trim();
            console.log('Search keyword:', keyword); // Debug: 顯示使用者輸入的搜索關鍵字
        });

        // 讀取多個CSV檔案
        const csvFiles = [
            '新北市診所_經緯度.csv',
            '台北市診所_經緯度.csv', 
            '桃園市診所_經緯度.csv',
            '臺南市診所_經緯度.csv',
            '臺中市診所_經緯度.csv',
            '高雄市診所_經緯度.csv'
        ];
    loadClinicsFromCSV(csvFiles);

    // 監聽輸入框的 change 事件
    clinicSearch.addEventListener('change', function() {
        let selectedClinicName = clinicSearch.value; // 獲取輸入框的值
        let options = clinicList.options;

        for (let i = 0; i < options.length; i++) {
            let option = options[i];
            if (option.value === selectedClinicName) {
                // 獲取對應的經緯度
                let latitude = parseFloat(option.getAttribute('data-lat'));
                let longitude = parseFloat(option.getAttribute('data-lon'));

                console.log('Selected clinic:', selectedClinicName); // Debug: 顯示選擇的診所名稱
                console.log('Latitude:', latitude, 'Longitude:', longitude); // Debug: 顯示診所的經緯度

                if (!isNaN(latitude) && !isNaN(longitude)) {
                    let coordinates = ol.proj.fromLonLat([longitude, latitude]);  // 將經緯度轉換為地圖坐標
                    console.log('Map coordinates:', coordinates); // Debug: 顯示轉換後的地圖坐標

                    map.getView().animate({
                        center: coordinates,
                        zoom: 16
                    });
                    console.log('Map animation triggered.'); // Debug: 確認地圖動畫被觸發

                    // 在這裡添加 popup 的顯示邏輯
                    // 假設你有一個特徵對應於這個選項
                    let feature = getFeatureByName(selectedClinicName); // 這是一個假設的函數，你需要根據實際情況獲取對應的特徵

                    if (feature) {
                        var popupCoordinates = feature.getGeometry().getCoordinates(); // 獲取 popup 的位置
                        popup.setPosition(popupCoordinates); // 設置 popup 位置

                        var specialties = feature.get('specialties').split(',').map(function(specialty) {
                            return specialty.trim();
                        });
                        console.log(specialties);

                        var content = '<b>' + feature.get('name') + '</b><br>' +
                            '☎️電話: ' + feature.get('phone') + '<br>' +
                            '📓科別: ';

                        // Remove the last element from the list
                        specialties.pop();
                        specialties.forEach(function(specialty) {
                            content += '' + specialty + ' ';
                        });

                        if (feature.get('doctor') !== '0') {
                            content += '<br>💉醫師: ' + feature.get('doctor') + '位';
                        }
                        if (feature.get('TCM_doctor') !== '0') {
                            content += '<br>🌿中醫師: ' + feature.get('TCM_doctor') + '位';
                        }
                        if (feature.get('dentist') !== '0') {
                            content += '<br>🦷牙醫師: ' + feature.get('dentist') + '位';
                        }
                        if (feature.get('pharmacist') !== '0') {
                            content += '<br>💊藥師: ' + feature.get('pharmacist') + '位';
                        }
                        content += '<br>地址: ' + feature.get('address');

                        // 更新 popup 的內容
                        document.getElementById('popup-content').innerHTML = content;
                        document.getElementById('popup').style.display = 'block'; // 顯示 popup
                    }
                } else {
                    console.error('Invalid coordinates for the selected clinic.'); // Debug: 經緯度無效的錯誤訊息
                }
                break; // 找到對應選項後可跳出循環
            }
        }
    });

    // 假設的函數，根據診所名稱獲取相應的 feature
    function getFeatureByName(name) {
        let foundFeature = null;
        map.getLayers().forEach(function(layer) {
            if (layer instanceof ol.layer.Vector) {
                layer.getSource().getFeatures().forEach(function(feature) {
                    if (feature.get('name') === name) {
                        foundFeature = feature;
                    }
                });
            }
        });
        return foundFeature;
    }
}

export { initMap };