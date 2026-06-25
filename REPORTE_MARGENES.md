# Reporte de Márgenes de Ganancia

**Última actualización:** Junio 2026

---

## Parámetros base

| Variable | Valor |
|---|---|
| Tipo de cambio | 1 USD = $1.420 ARS |
| Fee MercadoPago | 4% por transacción |
| Render (compute) | $25 USD/mes → hasta 6 clientes |
| MongoDB Atlas | $30 USD/mes → hasta ~30 clientes |

---

## Planes actuales

| Plan | USD/mes | ARS/mes |
|---|---|---|
| Emprendedor | $15 | $21.300 |
| Profesional | $35 | $49.700 |
| Empresarial | $70 | $99.400 |

---

## Add-ons (Empresarial)

| Add-on | USD/mes | ARS/mes |
|---|---|---|
| Tienda Online | $10 | $14.200 |
| Sucursal extra | $12 | $17.040 |
| Pack 5 usuarios extra | $8 | $11.360 |

> Los add-ons no agregan carga significativa de infra — margen casi puro.

---

## Costo de infraestructura por escala

| Clientes | Render | Mongo | **Total infra** | **Costo/cliente** | **Costo/cliente ARS** |
|---|---|---|---|---|---|
| 6 | $25 | $30 | **$55** | **$9,17** | $13.021 |
| 12 | $50 | $30 | **$80** | **$6,67** | $9.467 |
| 18 | $75 | $30 | **$105** | **$5,83** | $8.283 |
| 24 | $100 | $30 | **$130** | **$5,42** | $7.697 |
| 30 | $125 | $30 | **$155** | **$5,17** | $7.341 |

---

## Margen neto por plan

> Fórmula: `Precio − MP(4%) − Infra/cliente = Ganancia neta`

### A 6 clientes — Infra: $9,17/cliente

| Plan | Precio | − MP | − Infra | **Ganancia USD** | **Ganancia ARS** | **Margen** |
|---|---|---|---|---|---|---|
| Emprendedor | $15 | $0,60 | $9,17 | **$5,23** | **$7.427** | 34,9% |
| Profesional | $35 | $1,40 | $9,17 | **$24,43** | **$34.690** | 69,8% |
| Empresarial | $70 | $2,80 | $9,17 | **$58,03** | **$82.403** | 82,9% |

### A 12 clientes — Infra: $6,67/cliente

| Plan | Precio | − MP | − Infra | **Ganancia USD** | **Ganancia ARS** | **Margen** |
|---|---|---|---|---|---|---|
| Emprendedor | $15 | $0,60 | $6,67 | **$7,73** | **$10.977** | 51,5% |
| Profesional | $35 | $1,40 | $6,67 | **$26,93** | **$38.241** | 76,9% |
| Empresarial | $70 | $2,80 | $6,67 | **$60,53** | **$85.953** | 86,5% |

### A 30 clientes — Infra: $5,17/cliente

| Plan | Precio | − MP | − Infra | **Ganancia USD** | **Ganancia ARS** | **Margen** |
|---|---|---|---|---|---|---|
| Emprendedor | $15 | $0,60 | $5,17 | **$9,23** | **$13.107** | 61,5% |
| Profesional | $35 | $1,40 | $5,17 | **$28,43** | **$40.371** | 81,2% |
| Empresarial | $70 | $2,80 | $5,17 | **$62,03** | **$88.083** | 88,6% |

---

## Escenario mixto realista (30% Emp · 50% Pro · 20% Ent)

| Clientes | Mix | Ingresos brutos | − MP | − Infra | **Ganancia neta USD** | **Ganancia neta ARS** | **Margen** |
|---|---|---|---|---|---|---|---|
| 6 | 2/3/1 | $205 | $8,20 | $55 | **$141,80** | **$201.356** | 69,2% |
| 12 | 4/6/2 | $410 | $16,40 | $80 | **$313,60** | **$445.312** | 76,5% |
| 20 | 6/10/4 | $680 | $27,20 | $105 | **$547,80** | **$777.876** | 80,6% |
| 30 | 9/15/6 | $1.080 | $43,20 | $155 | **$881,80** | **$1.252.156** | 81,7% |

---

## Punto de equilibrio (break-even solo infra)

| Escenario | Clientes mínimos |
|---|---|
| Solo Emprendedor | **4 clientes** |
| Solo Profesional | **2 clientes** |
| Solo Empresarial | **1 cliente** |
| Mix realista (30/50/20) | **2 clientes** |

---

## Notas y alertas

- **Emprendedor a $15** tiene margen ajustado en escala baja (35% con 6 clientes). Considerar subir a **$18** para colchón operativo.
- El modelo escala bien: de 6 a 30 clientes el margen mejora ~12 puntos porcentuales sin cambiar precios.
- Al escalar Render se necesita una nueva instancia cada 6 clientes adicionales ($25 más).
- MongoDB puede mantenerse en $30 hasta ~30 clientes; revisar al superar ese umbral.
- El tipo de cambio ARS/USD es volátil — revisar y actualizar este reporte al ajustar precios.

---

## Escenario de lanzamiento — 2 Profesional + 2 Empresarial

> Punto de partida real: 4 clientes iniciales antes de escalar.

### Infraestructura
| Concepto | Costo |
|---|---|
| Render (1 instancia, 4 clientes dentro del límite de 6) | $25 |
| MongoDB | $30 |
| **Total infra** | **$55 / $78.100 ARS** |
| Costo por cliente | **$13,75 / $19.525 ARS** |

### Ingresos y márgenes

| Plan | Clientes | Precio unit. | Ingresos | − MP 4% | − Infra | **Ganancia USD** | **Ganancia ARS** | **Margen** |
|---|---|---|---|---|---|---|---|---|
| Profesional | 2 | $35 | $70 | $2,80 | $27,50 | **$39,70** | **$56.374** | 56,7% |
| Empresarial | 2 | $70 | $140 | $5,60 | $27,50 | **$106,90** | **$151.798** | 76,4% |
| **Total** | **4** | — | **$210** | **$8,40** | **$55** | **$146,60** | **$208.172** | **69,8%** |

### Precios recomendados para este lanzamiento

**Planes base:**

| Plan | USD/mes | ARS/mes | Observación |
|---|---|---|---|
| Emprendedor | $15 | $21.300 | No se lanza inicialmente — disponible desde el comienzo |
| Profesional | $35 | $49.700 | Tier principal de lanzamiento |
| Empresarial | $70 | $99.400 | Tier premium de lanzamiento |

**Add-ons:**

| Add-on | USD/mes | ARS/mes | Margen estimado |
|---|---|---|---|
| Tienda Online | $10 | $14.200 | ~98% (sin costo infra adicional) |
| Sucursal extra | $12 | $17.040 | ~98% (sin costo infra adicional) |
| Pack 5 usuarios | $8 | $11.360 | ~98% (sin costo infra adicional) |

### Conclusión del lanzamiento
- Infra cubierta desde el **día 1** con solo estos 4 clientes.
- Si ambos Empresariales contratan 1 sucursal extra → ingresos adicionales **+$24 USD / +$34.080 ARS** sin costo extra de infra.
- El margen de **69,8%** en lanzamiento es sólido; mejorará al sumar clientes sin cambiar infra hasta los 6.

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| Junio 2026 | Versión inicial. Precios: Emp $15 / Pro $35 / Ent $70 USD. Add-ons: Tienda $10, Sucursal $12, Pack usuarios $8. |
| Junio 2026 | Agregado escenario de lanzamiento: 2 Profesional + 2 Empresarial. Margen 69,8%. Infra cubierta desde día 1. |
