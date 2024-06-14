'use strict'
const express = require('express')
const {Pool,Client} = require('pg')
const router = express.Router();
router.use(express.json())
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Proyect_manager',
    password: 'admin',
    port: 5432,
})

let sendCorreo = (email,nombre,nombreActividad, fechaInicio, fechaFin, descripcion) => {
    const nodemailer = require('nodemailer');

    // Configuración del transportador (SMTP)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Puedes cambiar esto según el proveedor de correo que estés utilizando
        auth: {
            user: 'testodoo51@gmail.com',
            pass: 'twbg mkea dfgq tbzl ',
        },
    });

    // Detalles del mensaje
    const mailOptions = {
        from: 'gestioprogressio@gmail.com',
        to: `${email}`,
        subject: 'Notificacion de Integracion de Actividades',
        text: `
        Estimado ${nombre}
        Espero que este mensaje te encuentre bien. Me complace informarte que has sido integrado para participar en una actividad crucial dentro de nuestro proyecto actual. Tu contribución y experiencia serán fundamentales para el éxito de esta fase.
        A continuación, te proporcionaré algunos detalles adicionales sobre la actividad:
        Nombre de la actividad:
        ${nombreActividad}
        Fecha Inicio
        ${fechaInicio}
        Fecha de Fin
        ${fechaFin}
        Descripcion de las actividad
        ${descripcion}
        `,
    };

    // Envío del correo electrónico
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
        } else {
            console.log('Correo electrónico enviado: ' + info.response);
        }
    });

}

// const client = new Client();
router.get(
    '/conection',
    async (req,res)=>{
        try {
            console.log('entro');
            const consulta = await pool.query('SELECT 1');
            sendCorreo('cesarcasillascespedes@gmail.com','Cesar','Prueba','2024-01-01','2024-02-02','Descripcion');
            return res.status(400).json({'message':consulta})
        } catch (error) {
            return res.status(202).json({message:error})
        }
    }
);

// Consultar Registros de Empleados
router.get(
    '/staff',
    async (req,res)=>{
        try {
            const consulta = await pool.query('SELECT * FROM Persona');
            return res.status(400).json({'message':consulta})
        } catch (error) {
            return res.status(202).json({message:error})
        }
    }
);

// Consultar Roles de Empleado
router.get(
    '/roles/:id',
    async (req,res)=>{
        try {
            const id = req.params.id;
            const consulta = await pool.query(`SELECT R.nombre AS Roles FROM Rol R JOIN RolPer RP ON R.rol_id = RP.rol_id JOIN Persona P ON RP.personaID = P.personaID WHERE P.personaID = ${id}`);
            return res.status(400).json({'message':consulta})
        } catch (error) {
            return res.status(202).json({message:error})
        }
    }
);

// Consultar Todos los datos de todos los miembros del staff
router.get(
    '/staffB',
    async (req,res)=>{
        try {
            const consulta = await pool.query('SELECT P.personaID, P.nombre AS NombrePersona, P.email, P.jefeID, R.rol_id, R.nombre AS NombreRol FROM Persona P LEFT JOIN RolPer RP ON P.personaID = RP.personaID LEFT JOIN Rol R ON RP.rol_id = R.rol_id')
            return res.status(400).json({'message':consulta})
        } catch (error) {
            return res.status(202).json({message:error})
        }
    }
);

// Consultar Todos los datos de todos los proyectos
router.get('/proyectos', async (req, res) => {
    try {
        const consulta = await pool.query('SELECT P.*, G.nombre AS nombreEncargado FROM Proyectos P LEFT JOIN Persona G ON P.encargadoID = G.personaID');
        console.log('consulto');
        return res.status(200).json({ 'data': consulta.rows });
    } catch (error) {
        return res.status(500).json({ 'error': error.message });
    }
});


// Agregar un nuevo empleado
router.get('/personas/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const consulta = await pool.query('SELECT * FROM Persona WHERE jefeid = $1', [id]);
        return res.status(201).json({ 'data': consulta.rows });
    } catch (error) {
        return res.status(500).json({ 'error': error.message });
    }
});

//Obtener info de los recursos
router.get('/recursos', async (req, res)=>{
    try{
        const consulta = await pool.query('SELECT * FROM Recursos WHERE proyectoid IS NULL AND actividadid IS NULL');
        return res.status(201).json({'data':consulta.rows})
    }
    catch (error){
        return res.status(500).json({'error':error.message})
    }
})

// Agregar un nuevo empleado
router.post('/personas', async (req, res) => {
    try {
        const { nombre, email, jefeID } = req.body;
        const consulta = await pool.query('INSERT INTO Persona (nombre, email, jefeID) VALUES ($1, $2, $3) RETURNING *', [nombre, email, jefeID]);
        return res.status(201).json({ 'data': consulta.rows });
    } catch (error) {
        return res.status(500).json({ 'error': error.message });
    }
});

// Agregar un nuevo proyecto
router.post('/proyectos', async (req, res) => {
    try {
        const { fechaInicio, fechaFin, descripcion, nombre } = req.body;
        const consulta = await pool.query('INSERT INTO Proyectos (fechaInicio, fechaFin, descripcion, nombre) VALUES ($1, $2, $3, $4) RETURNING *', [fechaInicio, fechaFin, descripcion, nombre]);
        return res.status(201).json({ 'data': consulta.rows });
    } catch (error) {
        return res.status(500).json({ 'error': error.message });
    }
});

// Agregar una nueva actividad
router.post('/actividades', async (req, res) => {
    try {
        const { nombre, descripcion, fechaInicio, fechaFin, proyectoID } = req.body;
        const consulta = await pool.query('INSERT INTO Actividad (nombre, descripcion, fechaInicio, fechaFin, proyectoID) VALUES ($1, $2, $3, $4, $5) RETURNING *', [nombre, descripcion, fechaInicio, fechaFin, proyectoID]);
        return res.status(201).json({ 'data': consulta.rows });
    } catch (error) {
        return res.status(500).json({ 'error': error.message });
    }
});

// Ruta para agregar una nueva actividad
router.post('/agregarActividad', async (req, res) => {
    try {
        // console.log(req);
      const {areSubActividades,nombreActividad, descripcion, fechaInicio, fechaFin, personalAsignado, recursos, subActividades, proyectoId } = req.body;
  
      // Iniciar una transacción
      const client = await pool.connect();
      await client.query('BEGIN');
  
      try {
        // console.log(descripcion);
        // Insertar la actividad principal
        console.log(proyectoId);
        const actividadQuery = await client.query(
          'INSERT INTO Actividad(nombre, descripcion, fechainicio,fechafin,proyectoid) VALUES ($1,$2,$3,$4,$5) RETURNING actividadid',
          [nombreActividad, descripcion, fechaInicio, fechaFin, proyectoId]
        );
        let actividadID = actividadQuery.rows[0].actividadid;
        // console.log(actividadID);
  
        // Insertar personal asignado
        if (personalAsignado && personalAsignado.length > 0) {
          await Promise.all(
            personalAsignado.map(async (persona) => {
              await client.query(
                'INSERT INTO PersActi(personaID, actividadID) VALUES ($1, $2)',
                [persona.personaid, actividadID]
              );
            })
          );
        }
        console.log("Kha??");
        // Insertar subactividades (si existen)
        if (areSubActividades && subActividades && subActividades.length > 0) {
          await Promise.all(
            subActividades.map(async (subActividad) => {
              await client.query(
                'INSERT INTO SubActividad(nombre, descripcion, fechaInicio, fechaFin, actividadId, encargadoid) VALUES ($1, $2, $3, $4, $5, $6)',
                [subActividad.nombre, subActividad.descripcion, subActividad.fechaInicio, subActividad.fechaFin, actividadID, subActividad.personalAsginado.personaid]
              );
            })
          );
        }else{ 
            //Insertar los recursos (si existen)
            if(!areSubActividades && recursos && recursos.length > 0){
                await Promise.all(
                    recursos.map( async (recurso)=>{
                        await client.query(
                            'UPDATE Recursos SET proyectoid = $1, actividadid = $2 WHERE recursoid = $3',
                            [proyectoId,actividadID,recurso.recursoid]
                        )
                    })
                )
            }
        }
  
        // Commit de la transacción
        await client.query('COMMIT');
        personalAsignado.forEach(persona => {
            sendCorreo(persona.email,persona.nombre,nombreActividad,fechaInicio,fechaFin, descripcion)                
            });
        console.log('ok');
        return res.status(201).json({ message: 'Actividad y subactividades creadas correctamente' });
      } catch (error) {
        // Si hay algún error, hacer un rollback de la transacción
        await client.query('ROLLBACK');
        throw error;
      } finally {
        // Liberar el cliente de la conexión
        client.release();
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });


module.exports = router;