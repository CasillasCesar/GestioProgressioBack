'use strict'
const bcrypt = require('bcrypt')
const UserModel = require('./UserModel')
const express = require('express')
const { Pool, Client } = require('pg')
const router = express.Router();
const jwt = require('jsonwebtoken');
router.use(express.json());
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const UserModel = require('./UserModel');
const path = require('path'); 


const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Proyect_manager',
  password: 'admin',
  port: 5432,
});

const userModel = new UserModel();

const JWT_SECRET = 'ClaveDecodeTOken'; // Valor hardcodeado - pruebas

// Registro de usuarios
router.post('/register', async (req, res) => {
  const { nombre_usuario, correo_usuario, contrasena_usuario, empresa_id } = req.body;
  // console.table({ nombre_usuario, correo_usuario, contrasena_usuario, empresa_id })

  if (!nombre_usuario || !correo_usuario || !contrasena_usuario || !empresa_id) {
    return res.status(400).json({ message: "Todos los campos son obligatorios." });
  }

  try {
    userModel.findUserByUsername(nombre_usuario).then((data)=>{
      // console.log(data);  
      if (!data) {
        userModel.findByEmail(correo_usuario).then((dataMail)=>{
          // console.log(dataMail);
          if(!dataMail){
            userModel.findEmpresa(empresa_id).then(async (dataEmpresa)=>{
              console.log('dataEmpresa');
              console.log(dataEmpresa);
              console.log('dataEmpresa');
              if(dataEmpresa){
                const hashedPassword = await bcrypt.hash(contrasena_usuario, 10);
                const verificationToken = jwt.sign({ nombre_usuario, correo_usuario }, JWT_SECRET, { expiresIn: '150s' });
                const tokenExpirationDate = new Date(Date.now() + 150 * 1000); // Calcular la fecha de expiración

                // Guarda el usuario con estado pendiente
                await userModel.createPendingUser({
                  nombre_usuario,
                  correo_usuario,
                  contrasena_usuario: hashedPassword,
                  verificationToken,
                  tokenExpires: tokenExpirationDate
                });

                // Enviar correo de verificación
                const transporter = nodemailer.createTransport({
                  service: 'gmail', // Puedes cambiar esto según el proveedor de correo que estés utilizando
                  auth: {
                    user: 'testodoo51@gmail.com',
                    pass: 'twbg mkea dfgq tbzl ',
                  },
                });
                const mailOptions = {
                  from: '"GestioProgressio" <no-reply@gp.com>',
                  to: correo_usuario,
                  subject: 'Verifica tu cuenta en GestioProgressio',
                  html: `
                  <!DOCTYPE html>
                    <html lang="es">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body {
                          background-color: #f4f4f4;
                          font-family: 'Arial', sans-serif;
                          margin: 0;
                          padding: 0;
                          color: #333;
                        }
                        .container {
                          background-color: #ffffff;
                          width: 100%;
                          max-width: 600px;
                          margin: 20px auto;
                          padding: 20px;
                          box-shadow: 0 0 10px rgba(0,0,0,0.1);
                          border-radius: 8px;
                        }
                        p {
                          font-size: 16px;
                        }
                        a {
                          display: inline-block;
                          background-color: #007BFF;
                          color: #ffffff;
                          padding: 10px 20px;
                          margin: 20px 0;
                          border-radius: 5px;
                          text-decoration: none;
                          font-weight: bold;
                        }
                        a href{
                          color: #fffff;
                        }
                        a:hover {
                          background-color: #0056b3;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <h2>Hola, ${nombre_usuario}</h2>
                        <p>Gracias por registrarte en nuestra plataforma. Estás a solo un paso de activar tu cuenta y empezar a utilizar nuestros servicios.</p>
                        <p>Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:</p>
                        <a href="http://${req.headers.host}/verify-account?token=${verificationToken}">Verificar Cuenta</a>
                        <p>Si no has solicitado este correo, puedes ignorarlo de forma segura.</p>
                      </div>
                    </body>
                    </html>
                  `
                };

                await transporter.sendMail(mailOptions);
                res.status(201).json({ message: "Registro exitoso. Por favor revisa tu correo electrónico para activar la cuenta." });
              }else{
                return res.status(409).json({ message: "No se encontro la empresa" });
              }
            })
          }else{
            return res.status(409).json({ message: "El correo electrónico ya está en uso." });
          }
        })
      }else{
        return res.status(409).json({ message: "El nombre de usuario ya existe." });
      }
    })
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// Verificar la cuenta del usuario
router.get('/verify-account', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Token de verificación requerido.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Asegúrate de que JWT_SECRET es una constante definida y accesible.
    const user = await userModel.findByEmail(decoded.correo_usuario);

    if (user) {
      if (new Date(user.token_expires) > new Date()) {
        // Si el token aún no ha expirado y el usuario aún no está verificado, procede a verificarlo.
        const verified = await userModel.activateUser(decoded.correo_usuario);
        if (verified) {
          res.sendFile(path.join(__dirname, './confirmation.html')); // Asegúrate de que la ruta es correcta y el archivo existe.
        } else {
          res.status(400).send('No se pudo verificar la cuenta.');
        }
      } else {
        // Si el token ha expirado, elimina al usuario de la base de datos.
        await userModel.deleteUser(decoded.correo_usuario);
        res.status(403).send('Token de verificación expirado y el usuario ha sido eliminado.');
      }
    } else {
      res.status(404).send('Usuario no encontrado.');
    }
  } catch (error) {
    console.error('Error al verificar el usuario:', error);
    if (error.name === 'TokenExpiredError') {
      // Intenta eliminar al usuario solo si el error es debido a que el token ha expirado.
      await userModel.deleteUser(decoded.correo_usuario);
      res.status(403).send('Token de verificación expirado y el usuario ha sido eliminado.');
    } else {
      res.status(500).send('Error al verificar la cuenta.');
    }
  }
});


// Inicio de sesión
router.post('/login', async (req, res) => {
  const { nombre_usuario, contrasena_usuario } = req.body;

  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE nombre_usuario = $1;", [nombre_usuario]);

    if (result.rows.length > 0) {
      const loginData = result.rows[0];

      // Verificar si el usuario está activo o verificado
      if (!loginData.is_verified) {
        return res.status(403).json({ message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico.' });
      }

      const isValid = await bcrypt.compare(contrasena_usuario, loginData.contrasena_usuario);

      if (isValid) {
        const token = jwt.sign(
          { id: loginData.id, nombre_usuario: loginData.nombre_usuario },
          JWT_SECRET,
          { expiresIn: '200s' } // Ajustar según la política de expiración deseada
        );
        res.json({ message: 'Inicio de sesión exitoso.', token });
      } else {
        res.status(400).send('Contraseña incorrecta');
      }
    } else {
      res.status(404).send('Usuario no existe');
    }
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).send(err);
  }
});

router.post('/forgot-password', async (req, res) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar esto según el proveedor de correo que estés utilizando
    auth: {
      user: 'testodoo51@gmail.com',
      pass: 'twbg mkea dfgq tbzl ',
    },
  });

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


let sendCorreo = (email, nombre, nombreActividad, fechaInicio, fechaFin, descripcion) => {
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
  async (req, res) => {
    try {
      console.log('entro');
      const consulta = await pool.query('SELECT 1');
      sendCorreo('mazin3037.fa@gmail.com', 'GP', 'Prueba', '2024-01-01', '2024-02-02', 'Descripcion');
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
      personalAsignado.forEach(persona => {
        sendCorreo(persona.email, persona.nombre, nombreActividad, fechaInicio, fechaFin, descripcion)
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

// Endpoint para refrescar el token
router.post('/refresh-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).send('Token no proporcionado');
  }

  try {
    // Verifica el token existente
    const decoded = jwt.verify(token, JWT_SECRET);

    // Si el token es válido pero está cerca de expirar, emite uno nuevo
    const newToken = jwt.sign(
      { id: decoded.id, nombre_usuario: decoded.nombre_usuario },
      JWT_SECRET,
      { expiresIn: '30s' } // Renueva el token por otros 90 segundos
    );

    res.json({ message: 'Token refrescado exitosamente.', token: newToken });
  } catch (error) {
    // Si el token es inválido o ha expirado
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).send('Token expirado');
    } else {
      res.status(500).send('Error al verificar el token');
    }
  }
});



module.exports = router;