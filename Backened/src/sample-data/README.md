# Sample Heat Map Data

This directory contains sample heat map data for testing and development.

## Badaun Subdistricts Heat Map Data

File: `badaun-subdistricts-heatmap.json`

Contains heat map data for the 5 subdistricts of Badaun:
1. **Bilsi** - 25 heat value, 12 complaints
2. **Bisauli** - 18 heat value, 9 complaints
3. **Budaun** - 45 heat value, 22 complaints (highest)
4. **Dataganj** - 15 heat value, 7 complaints
5. **Sahaswan** - 20 heat value, 10 complaints

### How to Use

You can populate this data into the database using the test endpoint:

#### Using curl:

```bash
curl -X POST http://localhost:5000/api/v1/test/heatmap \
  -H "Content-Type: application/json" \
  -d @sample-data/badaun-subdistricts-heatmap.json
```

#### Using Postman or similar tools:

1. Method: **POST**
2. URL: `http://localhost:5000/api/v1/test/heatmap`
3. Headers: `Content-Type: application/json`
4. Body: Copy the contents of `badaun-subdistricts-heatmap.json`

### Expected Result

After uploading, you should see the Badaun subdistricts rendered on the map with different colors based on their heat values:
- **Budaun** (45) - Darkest red (highest complaints)
- **Bilsi** (25) - Medium red
- **Sahaswan** (20) - Light-medium red
- **Bisauli** (18) - Light red
- **Dataganj** (15) - Lightest red (lowest complaints)

### Notes

- This is sample data for demonstration purposes
- Heat values range from 15-45 to show color gradient differences
- Each subdistrict includes realistic complaint breakdowns by status and category
- Data matches the GeoJSON properties in `badaun.ervc.geojson` (using `sdtname` property)

