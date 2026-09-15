# Remix of cmgeventos

Quiero que me crees una aplicación web responsive, enfocada primero en pantalla móvil, para registro de asistentes a un evento. Debe verse muy bien en celular y también funcionar en web escritorio.

## OBJETIVO

Construir un sistema de registro de invitados para evento, con:

1. formulario público de registro

2. panel administrador aparte

3. CRUD para catálogos o combos dinámicos

4. generación automática de invitación en PDF al momento del registro

5. envío inmediato de la invitación al correo del asistente

6. generación de link de descarga de la invitación

7. opción de compartir o abrir WhatsApp con mensaje y enlace de descarga

---

## 1) PANTALLA PÚBLICA DE REGISTRO

Crear una pantalla web mobile-first con diseño limpio, elegante y profesional.

### Campos del formulario

Debe incluir exactamente estos campos:

1. NOMBRE(S) *  

   - tipo texto

   - obligatorio

2. APELLIDOS *  

   - tipo texto

   - obligatorio

3. FECHA DE NACIMIENTO *  

   - dividida en 3 combos:

     - DÍA *

     - MES *

     - AÑO *

   - obligatorios

   - al seleccionar la fecha, calcular automáticamente la EDAD

4. EDAD *  

   - autocalculada según fecha de nacimiento

   - solo lectura

   - obligatoria

5. TIPO DOCUMENTO *  

   - combo dinámico desde catálogo administrable

   - obligatorio

6. NÚMERO DOCUMENTO *  

   - tipo texto

   - obligatorio

   - no debe permitir duplicados si ya existe un registro con el mismo tipo y número de documento

7. TELÉFONO *  

   - tipo texto

   - obligatorio

8. DIRECCIÓN *  

   - tipo texto

   - obligatorio

9. BARRIO *  

   - tipo texto o combo dinámico administrable

   - obligatorio

   - déjalo parametrizable para que pueda cambiarse fácilmente a combo

10. CORREO *  

   - tipo email

   - obligatorio

   - aquí se enviará la invitación PDF y el link de descarga

11. ESTADO CIVIL *  

   - combo dinámico desde catálogo administrable

   - obligatorio

12. SEXO *  

   - combo dinámico desde catálogo administrable

   - obligatorio

13. CDP *  

   - combo dinámico desde catálogo administrable

   - obligatorio

14. RED *  

   - combo dinámico desde catálogo administrable

   - obligatorio

15. NOMBRE DE QUIEN TE INVITÓ  

   - tipo texto

   - opcional o configurable como obligatorio desde administración

16. BOTÓN ENVIAR  

   - texto del botón: ENVIAR

---

## 2) VALIDACIONES DEL FORMULARIO

Agregar validaciones claras y amigables:

- todos los campos con * son obligatorios

- validar formato correcto del correo

- validar que teléfono y documento acepten formato correcto

- evitar registros duplicados por tipo de documento + número de documento

- mostrar mensajes de error por campo

- mostrar mensaje de éxito al terminar el registro

---

## 3) COMBOS Y CATÁLOGOS DINÁMICOS

Debe existir un panel administrador separado para manejar los datos de los combos.

### Crear CRUD independiente para estos catálogos:

- Tipo de documento

- Estado civil

- Sexo

- CDP

- RED

- opcionalmente Barrio si se quiere manejar como catálogo dinámico

### Para cada catálogo:

- listar registros

- crear registro

- editar registro

- eliminar registro

- activar/inactivar opciones

- ordenar opciones

- búsqueda y filtros

- auditoría básica de fecha de creación y última modificación

### Importante

Los combos del formulario público deben cargarse desde estos catálogos en tiempo real.

---

## 4) FECHA DE NACIMIENTO

La fecha de nacimiento debe manejarse con 3 combos:

- día

- mes

- año

Requisitos:

- día, mes y año deben estar sincronizados

- validar fechas reales

- edad calculada automáticamente

- no permitir fechas futuras

- rango de años configurable desde administración si es posible

---

## 5) PROCESO AL HACER EL REGISTRO

Cuando el usuario haga clic en ENVIAR y el registro sea exitoso, el sistema debe hacer todo esto automáticamente, en este orden:

1. guardar el registro en base de datos

2. generar la invitación en PDF

3. generar código QR

4. enviar inmediatamente un correo al usuario

5. adjuntar el PDF en el correo

6. incluir también en el correo un link para descargar la invitación

7. generar un link para WhatsApp con mensaje prellenado y el enlace de descarga

8. mostrar en pantalla final de éxito:

   - “Registro exitoso”

   - botón Descargar invitación

   - botón Abrir WhatsApp

   - mensaje de que la invitación fue enviada al correo

---

## 6) INVITACIÓN PDF

Generar automáticamente un PDF bonito y profesional.

### El PDF debe incluir:

- nombre completo

- tipo de documento

- número de documento

- teléfono

- correo

- barrio

- estado civil

- sexo

- CDP

- RED

- nombre de quien te invitó

- fecha de registro

- código QR

- título del evento

- diseño elegante y limpio

- logo del evento si se configura desde administración

### Código QR

El código QR debe generarse usando como valor principal:

- el número de identificación de la persona

Opcionalmente, usar mejor este formato para mayor seguridad:

- un identificador único del registro

- pero mostrar también el número de documento en el PDF

---

## 7) CORREO AUTOMÁTICO

Al registrarse, el sistema debe enviar de inmediato un correo al usuario.

### El correo debe incluir:

- asunto configurable, por ejemplo: “Tu invitación al evento”

- mensaje personalizado con el nombre del usuario

- PDF adjunto

- botón o enlace de descarga de la invitación

- mensaje indicando que también puede compartir o abrir el enlace por WhatsApp

---

## 8) WHATSAPP

Generar un enlace a WhatsApp con mensaje predefinido.

### Ejemplo del mensaje:

“Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace: [LINK]”

### Requisitos:

- botón visible después del registro

- también incluir el enlace en el correo

- el link debe abrir WhatsApp Web o WhatsApp móvil según el dispositivo

---

## 9) LINK DE DESCARGA

Crear un enlace de descarga único para cada invitación.

### Requisitos del enlace:

- debe permitir descargar el PDF generado

- debe estar asociado al registro del usuario

- idealmente con token único o URL segura

- debe poder enviarse por correo y compartirse por WhatsApp

- si es posible, permitir expiración configurable o mantenerlo permanente según configuración admin

---

## 10) PANEL ADMINISTRADOR

Crear un panel administrativo separado con login.

### Funciones del administrador:

- ver listado de registros

- buscar por nombre, documento, correo, teléfono

- filtrar por fecha, sexo, estado civil, CDP, RED

- exportar registros a Excel o CSV

- ver detalle de cada registro

- reenviar invitación por correo

- regenerar PDF

- copiar link de descarga

- abrir enlace de WhatsApp

- administrar catálogos/combos

- configurar datos del evento

- configurar plantilla del correo

- configurar plantilla del PDF

- configurar logo, nombre del evento y textos

---

## 11) BASE DE DATOS

Crear estructura de base de datos para:

- usuarios administradores

- registros de asistentes

- catálogo tipo_documento

- catálogo estado_civil

- catálogo sexo

- catálogo cdp

- catálogo red

- catálogo barrio si aplica

- configuración del evento

- historial de envíos de correo

- historial de generación de invitaciones

---

## 12) EXPERIENCIA DE USUARIO

Quiero una interfaz:

- mobile first

- rápida

- clara

- moderna

- profesional

- con botones grandes

- campos cómodos para celular

- mensajes visuales de validación

- pantalla final de éxito

---

## 13) TECNOLOGÍA Y ARQUITECTURA

Quiero que construyas la solución completa lista para MVP:

- frontend responsive

- backend

- base de datos

- panel admin

- generación de PDF

- generación de QR

- envío de correos

- links de descarga

- integración con WhatsApp mediante enlace

---

## 14) ENTREGABLE

Crea primero un MVP totalmente funcional con estas pantallas:

1. login administrador

2. dashboard admin

3. CRUD de catálogos

4. formulario público de registro

5. pantalla de éxito post-registro

6. vista o endpoint para descargar la invitación PDF

---

## 15) DETALLES IMPORTANTES

- el registro debe enviar la invitación inmediatamente

- el correo debe salir justo al registrarse

- el link de descarga también debe generarse inmediatamente

- el botón de WhatsApp debe quedar disponible inmediatamente después del registro

- la edad debe calcularse automáticamente

- el sistema debe estar optimizado para pantalla móvil web

- usar nombres de campos en español

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://eventoscmg.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/60652305-77a2-4dda-8232-3e91010b66d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `master` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
