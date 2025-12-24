# Badaun District Officers Data

This document explains the hierarchical officer data structure for Badaun district, organized by sub-district/tehsil.

## 📍 Geographic Hierarchy

```
Uttar Pradesh (State LGD: 9)
└── Budaun District (District LGD: 134)
    ├── Bilsi Sub-district (LGD: 780)
    ├── Bisauli Sub-district (LGD: 779)
    ├── Budaun Sub-district (LGD: 782) [Headquarters]
    ├── Dataganj Sub-district (LGD: 783)
    └── Sahaswan Sub-district (LGD: 781)
```

## 👥 Officer Distribution by Sub-district

### Bilsi (LGD: 780)
| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| Sub Divisional Magistrate (SDM) | Revenue | 2,67,12,62,68,536 | 9454415833 |
| Tahsildar | Revenue | - | 9454415845 |
| Sub Officer (S.O.) | Revenue | 231324 | 9454402342 |

**Total Officers: 3**

---

### Bisauli (LGD: 779)
| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| Sub Divisional Magistrate (SDM) | Revenue | 2,64,91,42,82,14,115 | 9454415832 |
| Tahsildar | Revenue | - | 9454415837 |
| District Development Officer (D.D.O.) | Development | 244165 | 8303172203 |
| Circle Officer (C.O.) | Police | 244374, 244321 | 9454401320 |
| Sub Officer (S.O.) | Revenue | 262037 | 9454402349 |

**Total Officers: 5**

---

### Budaun (LGD: 782) [District Headquarters]
| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| **District Magistrate** | District Admin | 266406, 268301, 269308 | - |
| **ADM (City)** | District Admin | - | 9454417596 |
| **ADM (Executive)** | District Admin | - | 9454415831 |
| Sub Divisional Magistrate (SDM) | Revenue | 2,67,12,62,68,536 | 9454415833 |
| Tahsildar | Revenue | - | 9454415842 |
| District Development Officer (D.D.O.) | Development | 254231, 254232 | 8303172208 |
| Circle Officer (C.O.) - City | Police | 224342, 224497 | 9454401316 |
| Circle Officer (C.O.) - Budaun | Police | 224342, 225628 | 9454401317 |
| Sub Officer (S.O.) | Revenue | 254231, 254232 | 9454401318 |
| **SSP** | Police | 266342, 268308 | 9454402252 |
| **SP** | Police | 266342, 268940 | 9454401022 |

**Total Officers: 11** (includes district-level positions)

---

### Dataganj (LGD: 783)
| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| Tahsildar | Revenue | - | 9454415847 |
| District Development Officer (D.D.O.) | Development | 244324 | 9454402347 |
| Sub Officer (S.O.) | Revenue | 224208 | 9454402345 |

**Total Officers: 3**

---

### Sahaswan (LGD: 781)
| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| Tahsildar | Revenue | - | 9454415844 |
| District Development Officer (D.D.O.) | Development | 262267, 263072213 | 8303172213 |
| Circle Officer (C.O.) | Police | 227050, 254262 | 9454401319 |
| Sub Officer (S.O.) | Revenue | 221324 | 9454402347 |

**Total Officers: 4**

---

## 🏛️ District-Level Officers (Not Sub-district Specific)

| Position | Department | Phone | CUG |
|----------|-----------|--------|-----|
| Chief Development Officer | Development | 268975, 269661 | 9454436663 |
| District Development Officer | Development | - | 9454464662 |
| Project Director (D.R.D.A.) | Rural Development | - | 9410271494 |
| District Panchayati Raj Officer | Panchayati Raj | 221001 | 8303172207 |
| Police Line | Police | 224197 | - |
| LIU Inspector | Police | - | 9454402036 |
| Cyber Cell | Police | - | 7839667112 |
| Fire Brigade Superintendent | Fire Services | 224010 | - |
| Home Guard | Home Guard | - | 224091 |
| Nigam Pratap Singh (DIO) | NIC | 267119 | - |
| Ajeet Kumar Saxena | NIC | 267119 | - |
| Haroon Ayyub (Engineer) | NIC | 267119 | - |
| Atul Kumar Saxena | NIC | 267119 | - |

**Total District Officers: 13**

---

## 🏢 Other Department Officers

| Position | Department | Phone |
|----------|-----------|--------|
| District Economics & Statistical Officer | Economics & Statistics | 224199 |
| District Panchayati Raj Officer | Panchayati Raj | 225241 |
| District Social Welfare Officer | Social Welfare | 225124 |
| District Supply Officer | Supply | 224966 |
| District Forest Officer | Forest | 224105 |
| Senior Treasury Officer | Treasury | 224905 |
| Trade Tax Officer | Trade Tax | 224193 |
| Employment Officer | Employment | 224054 |

**Total Other Department Officers: 8**

---

## 📊 Overall Summary

| Category | Count |
|----------|-------|
| **Bilsi Officers** | 3 |
| **Bisauli Officers** | 5 |
| **Budaun Officers** | 11 |
| **Dataganj Officers** | 3 |
| **Sahaswan Officers** | 4 |
| **District-Level Officers** | 13 |
| **Other Departments** | 8 |
| **TOTAL OFFICERS** | **47** |

---

## 📂 Department Categories

Officers are categorized into:
- **Revenue** - SDMs, Tahsildars, Sub Officers
- **Development** - DDOs, DRDA, Panchayati Raj
- **Police** - SSP, SP, Circle Officers
- **Health** - Medical officers (to be added)
- **Education** - Education officers (to be added)
- **Engineering** - PWD, Engineers (to be added)
- **Other** - NIC, Fire, Home Guard, etc.

---

## 🚀 How to Import Data

### Step 1: Ensure MongoDB is Running

```bash
# Check if MongoDB is running
mongosh

# Or start MongoDB service
sudo service mongod start
```

### Step 2: Run the Seed Script

```bash
cd Backened
npm run seed-officers
# or
npx ts-node src/scripts/seedBadaunOfficers.ts
```

### Expected Output:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🗑️  Clearing existing Badaun officers...
✅ Cleared existing officers

📍 Processing Sub-district Officers...
  Processing Bilsi (LGD: 780)...
    ✓ Added 3 officers for Bilsi
  Processing Bisauli (LGD: 779)...
    ✓ Added 5 officers for Bisauli
  ...

📊 Summary by Sub-district:
════════════════════════════════════════════════════════════
  Bilsi                : 3 officers
  Bisauli              : 5 officers
  Budaun               : 11 officers
  Dataganj             : 3 officers
  Sahaswan             : 4 officers
  District Level       : 13 officers
════════════════════════════════════════════════════════════

✅ Total Officers Seeded: 47
🎉 Seeding completed successfully!
```

---

## 📝 Data Structure

Each officer record contains:

```typescript
{
  name: string;                    // Officer name
  designation: string;             // Position/title
  department: string;              // Department name
  departmentCategory: enum;        // Category (revenue/development/police/etc)
  email: string;                   // Email address
  phone: string;                   // Office phone number
  cug?: string;                    // CUG mobile number
  officeAddress: string;           // Office location
  residenceAddress?: string;       // Residence (if provided)
  districtName: string;            // "Budaun"
  districtLgd: number;             // 134
  subdistrictName?: string;        // Sub-district name (if applicable)
  subdistrictLgd?: number;         // Sub-district LGD (if applicable)
  isDistrictLevel: boolean;        // true for district officers
  isSubDistrictLevel: boolean;     // true for sub-district officers
}
```

---

## ✅ Data Quality Notes

### Completed:
- ✅ All 5 sub-districts included
- ✅ Proper LGD codes assigned
- ✅ Hierarchical structure maintained
- ✅ Phone and CUG numbers included
- ✅ Department categorization done

### Pending (Marked as "To Be Assigned"):
- ⏳ Officer names not provided in source data
- ⏳ Some email addresses missing
- ⏳ Some residence addresses missing

### To Update:
When actual officer names become available:
1. Open `badaun-officers-by-subdistrict.json`
2. Replace "To Be Assigned" with actual names
3. Run the seed script again to update database

---

## 🔍 Querying Officers

### Get all officers in a sub-district:

```javascript
const officers = await Officer.find({
  subdistrictName: "Bilsi"
});
```

### Get all district-level officers:

```javascript
const officers = await Officer.find({
  isDistrictLevel: true
});
```

### Get all revenue officers:

```javascript
const officers = await Officer.find({
  departmentCategory: "revenue"
});
```

### Get officers by sub-district LGD:

```javascript
const officers = await Officer.find({
  subdistrictLgd: 780  // Bilsi
});
```

---

## 📞 Contact Information Format

- **Phone**: Office landline numbers (may have multiple)
- **CUG**: Mobile numbers (Closed User Group)
- **Email**: Official email addresses (to be added)

---

## 🏷️ Sub-district LGD Codes

| Sub-district | LGD Code |
|--------------|----------|
| Bilsi | 780 |
| Bisauli | 779 |
| Budaun | 782 |
| Dataganj | 783 |
| Sahaswan | 781 |

**Note**: These LGD codes must match those in the GeoJSON files for proper mapping on the heat map.

---

## 📌 Next Steps

1. ✅ Import officer data into database
2. ⏳ Create API endpoints to fetch officers by sub-district
3. ⏳ Display officers on heat map when sub-district is clicked
4. ⏳ Add officer contact forms for complaint escalation
5. ⏳ Update officer names when information is available

---

**Last Updated**: December 2024

