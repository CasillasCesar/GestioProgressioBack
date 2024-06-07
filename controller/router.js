'use strict'
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
router.use(express.json());

const UserModel = require('./UserModel');
const userModel = new UserModel();

// Conexion BD
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Proyect_manager',
  password: 'nks123',
  port: 5432,
});

router.use(bodyParser.json());

// Registro de usuarios
router.post('/register', async (req, res) => {

  const { nombre_usuario, correo_usuario, contrasena_usuario } = req.body;

  if (!nombre_usuario || !correo_usuario || !contrasena_usuario) {
    return res.status(400).json({ message: "Los campos son requeridos" });
  }

  // Llamar al método createUser del modelo UserModel para crear el usuario
  try {
    // Verificar si el nombre de usuario ya existe
    const existingUser = await userModel.findUserByUsername(nombre_usuario);
    if (existingUser) {
      return res.status(409).json({ message: "El nombre de usuario ya existe" });
    }

    // Verificar si el correo electrónico ya existe
    const existingEmail = await userModel.findByEmail(correo_usuario);
    if (existingEmail) {
      return res.status(409).json({ message: "El correo electrónico ya está en uso" });
    }

    const newUser = await userModel.createUser({
      nombre_usuario,
      correo_usuario,
      contrasena_usuario
    });

    res.status(201).json({ message: "Usuario creado con éxito", usuario: newUser });
  } catch (error) {
    // Manejar los errores nombre de usuario duplicado, etc.
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ message: "Error al registrar el usuario" });
  }
});


// Inicio de sesion
router.post('/login', async (req, res) => {
  const { nombre_usuario, contrasena_usuario } = req.body;

  try {
    
    // Consulta a la base de datos para encontrar el usuario
    console.log(req.body);
    const result = await pool.query("SELECT * FROM usuarios WHERE nombre_usuario = $1;", [nombre_usuario]);
    console.log(result);

    if (result.rows.length > 0) {
      const loginData = result.rows[0];

      // Verificar la contraseña
      const isValid = await bcrypt.compare(contrasena_usuario, loginData.contrasena_usuario);

      if (isValid) {
        res.json({ message: 'Inicio de sesión exitoso.' });
      } else {
        res.status(400).send('Contraseña incorrecta');
      }
    } else {
      
      // Si no se encuentra el usuario, enviar un error
      res.status(404).send('Usuario no existe');
    }
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).send(err);
  }
});


/* RRECUPERACION POR MAIL */

// App servicio Gmail
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'frankrmz.fa37@gmail.com',
    pass: 'tucontraseña'
  }
});


// Recuperacion de contrseña
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

  if (user.rows.length === 0) {
    res.status(400).send('No hay cuentas con esta direccion de correo electrónico.');
    return;
  }

  // Crear un token de restablecimiento de contraseña
  const token = crypto.randomBytes(20).toString('hex');

  // Establecer el token en la base de datos junto con una fecha de expiración
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // El token expira en 1 hora

  await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3', [token, expiry, email]);

  // Opciones de correo electrónico
  let mailOptions = {
    to: email,
    from: 'passwordreset@demo.com',
    subject: 'Password Reset',
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
      `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
      `http://${req.headers.host}/reset-password/${token}\n\n` +
      `If you did not request this, please ignore this email and your password will remain unchanged.\n`
  };

  // Enviar el correo electrónico
  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      res.status(500).send('Error sending email');
    } else {
      res.status(200).send('An e-mail has been sent to ' + email + ' with further instructions.');
    }
  });
});

// const client = new Client();
router.get(
  '/conection',
  async (req, res) => {
    try {
      console.log('entro');
      const consulta = await pool.query('INSERT INTO');
      return res.status(400).json({ 'message': consulta })
    } catch (error) {
      return res.status(202).json({ message: error })
    }
  }
);

// Consultar Registros de Empleados
router.get(
  '/staff',
  async (req, res) => {
    try {
      const consulta = await pool.query('SELECT * FROM Persona');
      return res.status(400).json({ 'message': consulta })
    } catch (error) {
      return res.status(202).json({ message: error })
    }
  }
);

// Consultar Roles de Empleado
router.get(
  '/roles/:id',
  async (req, res) => {
    try {
      const id = req.params.id;
      const consulta = await pool.query(`SELECT R.nombre AS Roles FROM Rol R JOIN RolPer RP ON R.rol_id = RP.rol_id JOIN Persona P ON RP.personaID = P.personaID WHERE P.personaID = ${id}`);
      return res.status(400).json({ 'message': consulta })
    } catch (error) {
      return res.status(202).json({ message: error })
    }
  }
);

// Consultar Todos los datos de todos los miembros del staff
router.get(
  '/staffB',
  async (req, res) => {
    try {
      const consulta = await pool.query('SELECT P.personaID, P.nombre AS NombrePersona, P.email, P.jefeID, R.rol_id, R.nombre AS NombreRol FROM Persona P LEFT JOIN RolPer RP ON P.personaID = RP.personaID LEFT JOIN Rol R ON RP.rol_id = R.rol_id')
      return res.status(400).json({ 'message': consulta })
    } catch (error) {
      return res.status(202).json({ message: error })
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
router.get('/recursos', async (req, res) => {
  try {
    const consulta = await pool.query('SELECT * FROM Recursos WHERE proyectoid IS NULL AND actividadid IS NULL');
    return res.status(201).json({ 'data': consulta.rows })
  }
  catch (error) {
    return res.status(500).json({ 'error': error.message })
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

// Registrar proyecto
router.post('/proyectos', async (req, res) => {
  const { nombre, responsable, fechaInicio, fechaFin, descripcion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO proyectos (nombre, encargadoid, fechainicio, fechafin, descripcion) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, responsable, fechaInicio, fechaFin, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al insertar en la base de datos', error);
    res.status(500).send('Error al registrar proyecto');
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
    const { areSubActividades, nombreActividad, descripcion, fechaInicio, fechaFin, personalAsignado, recursos, subActividades, proyectoId } = req.body;

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
      } else {
        //Insertar los recursos (si existen)
        if (!areSubActividades && recursos && recursos.length > 0) {
          await Promise.all(
            recursos.map(async (recurso) => {
              await client.query(
                'UPDATE Recursos SET proyectoid = $1, actividadid = $2 WHERE recursoid = $3',
                [proyectoId, actividadID, recurso.recursoid]
              )
            })
          )
        }
      }

      // Commit de la transacción
      await client.query('COMMIT');
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