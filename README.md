# Sistema de Control Académico

Un sistema web completo de gestión académica con roles de Docente y Estudiante, que permite crear clases, gestionar calificaciones y asistencia.

## Características Principales

### Para Docentes
- Crear y gestionar clases propias
- Generar códigos de clase únicos para que los estudiantes se unan
- Registrar calificaciones con diferentes tipos (tareas, exámenes, proyectos, etc.)
- Llevar control de asistencia de los estudiantes
- Ver estadísticas de rendimiento de cada estudiante
- Cálculo automático de promedios ponderados

### Para Estudiantes
- Unirse a clases usando códigos proporcionados por docentes
- Visualizar todas las calificaciones en tiempo real
- Ver registros de asistencia
- Gráficos interactivos de rendimiento
- Exportar reportes académicos
- Ver promedio general y tasa de asistencia

## Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Visualización**: Chart.js + react-chartjs-2
- **Iconos**: Lucide React

## Instalación

1. Clona el repositorio
2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Uso

### Registro
1. Los usuarios se registran seleccionando su tipo de cuenta: **Estudiante** o **Docente**
2. Completan su información básica (nombre, apellido, correo, contraseña)

### Flujo del Docente
1. Inicia sesión y accede al dashboard de docente
2. Crea una nueva clase proporcionando:
   - Código de materia (ej: MAT101)
   - Nombre de la clase (ej: Cálculo I)
   - Créditos
   - Descripción
3. El sistema genera automáticamente un código de clase de 6 caracteres
4. Comparte el código con los estudiantes
5. Cuando los estudiantes se unan, podrás:
   - Registrar calificaciones con pesos personalizados
   - Marcar asistencia diaria
   - Ver estadísticas y promedios

### Flujo del Estudiante
1. Inicia sesión y accede al dashboard de estudiante
2. Haz clic en "Unirse a Clase"
3. Ingresa el código de 6 caracteres proporcionado por el docente
4. Una vez inscrito, podrás:
   - Ver todas tus calificaciones
   - Revisar tu asistencia
   - Ver gráficos de tu rendimiento
   - Exportar reportes en formato texto

## Características de Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Los docentes solo pueden gestionar sus propias clases
- Los estudiantes solo pueden ver sus propios datos
- Autenticación segura mediante Supabase Auth
- Códigos de clase únicos y aleatorios

## Estructura de la Base de Datos

- **profiles**: Información de usuarios (estudiantes, docentes, admins)
- **subjects**: Clases/materias con código de acceso
- **enrollments**: Inscripciones de estudiantes en clases
- **grades**: Calificaciones con sistema de pesos
- **attendance**: Registros de asistencia diaria
- **reports**: Metadatos de reportes generados

## Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Vista previa de producción
npm run lint         # Ejecutar ESLint
npm run typecheck    # Verificación de tipos TypeScript
```

## Próximas Mejoras

- Exportación de reportes en PDF
- Notificaciones por correo
- Vista de calendario académico
- Chat en tiempo real entre docentes y estudiantes
- Modo oscuro
- Aplicación móvil
