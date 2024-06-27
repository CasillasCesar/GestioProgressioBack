'use strict'

const UserModel = require('./UserModel')
const express = require('express')
const { Pool, Client } = require('pg')
const router = express.Router();
const jwt = require('jsonwebtoken');        // Crear token autentización
router.use(express.json());
const nodemailer = require('nodemailer');   // Funciones email
const path = require('path');               // Cargar archivo de una ruta
const crypto = require('crypto');           // Generar token 2fa
const bcrypt = require('bcrypt')            // Encriptar contraseñas


const pool = new Pool({
  user: 'postgres.fqxbxkwjdecasjtcqtly',
  host: 'aws-0-us-east-1.pooler.supabase.com',
  database: 'Proyect_manager',
  password: '>B*qW>qjtncm2~c',
  port: 6543,
});

const userModel = new UserModel();

const JWT_SECRET = 'ClaveDecodeTOken'; // Valor hardcodeado - pruebas

// Registro de usuarios
router.post('/register', async (req, res) => {
  const { nombre, email, contrasena, empresa_id } = req.body;
  // console.table({ nombre, email, contrasena, empresa_id })

  if (!nombre || !email || !contrasena || !empresa_id) {
    return res.status(400).json({ message: "Todos los campos son obligatorios." });
  }

  try {
    userModel.findUserByUsername(nombre).then((data) => {
      // console.log(data);  
      if (!data) {
        userModel.findByEmail(email).then(async (dataMail)=>{
          // console.log(dataMail);
          if (!dataMail) {
            userModel.findEmpresa(empresa_id).then(async (dataEmpresa) => {
              console.log('dataEmpresa');
              console.log(dataEmpresa);
              console.log('dataEmpresa');
              if (dataEmpresa) {
                const hashedPassword = await bcrypt.hash(contrasena, 10);
                const verificationToken = jwt.sign({ nombre, email }, JWT_SECRET, { expiresIn: '190s' }); // Duracion del token antes de volver a requerir una nueva verificacion
                const tokenExpirationDate = new Date(Date.now() + 3 * 60000); // Calcular la fecha de expiración = 3m

                // Guarda el usuario con estado pendiente
                await userModel.createPendingUser({
                  nombre,
                  email,
                  contrasena: hashedPassword,
                  verificationToken,
                  tokenExpires: tokenExpirationDate, 
                  empresa_id : dataEmpresa['empresaid']
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
                  from: '"GestioProgressio" <no-reply@gpmail.com>',
                  to: email,
                  subject: 'Verifique su cuenta en GestioProgressio',
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
                        .header {
                          text-align: center;
                          padding-bottom: 20px;
                          border-bottom: 1px solid #ddd;
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
                      .footer {
                          text-align: center;
                          padding-top: 20px;
                        }
                        .footer p{
                          font-size: 1.2em;
                          font-weight: bolder;
                        }
                      </style>
                    </head>
                    <body>
                    
                      <div class="container">
                       
                        <div class="header">
                        <h1>GestioProgressio</h1>
                        <h2>Confirme su registro</h2>
                        </div>
                        <h2>Hola, ${nombre}</h2>
                        <p>Gracias por registrarte en nuestra plataforma. Estás a solo un paso de activar tu cuenta y empezar a utilizar nuestros servicios.</p>
                        <p>Por favor, confirma tu cuenta haciendo clic en el siguiente enlace:</p>
                        <a href="http://${req.headers.host}/verify-account?token=${verificationToken}">Verificar Cuenta</a>
                        <p>Si no has solicitado este correo, puedes ignorarlo de forma segura.</p>
                             <br>
                             <p>¡Saludos!</p>
                      </div>
                      <div class="footer">
                             <p>GestioProgressio</p>
                       </div>
                    </body>
                    </html>
                  `
                };

                await transporter.sendMail(mailOptions);
                res.status(201).json({ message: "Registro exitoso. Por favor revisa tu correo electrónico para activar la cuenta." });
              } else {
                return res.status(409).json({ message: "No se encontro la empresa" });
              }
            })
          } else {
            return res.status(409).json({ message: "El correo electrónico ya está en uso." });
          }
        })
      } else {
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
    const user = await userModel.findByEmail(decoded.email);

    if (user) {
      if (new Date(user.token_expires) > new Date()) {
        // Si el token aún no ha expirado y el usuario aún no está verificado, procede a verificarlo.
        const verified = await userModel.activateUser(decoded.email);
        if (verified) {
          res.sendFile(path.join(__dirname, './confirmation.html')); // Asegúrate de que la ruta es correcta y el archivo existe.
        } else {
          res.status(400).send('No se pudo verificar la cuenta.');
        }
      } else {
        // Si el token ha expirado, elimina al usuario de la base de datos.
        await userModel.deleteUser(decoded.email);
        res.status(403).send('Token de verificación expirado y el usuario ha sido eliminado.');
      }
    } else {
      res.status(404).send('Usuario no encontrado.');
    }
  } catch (error) {
    console.error('Error al verificar el usuario:', error);
    if (error.name === 'TokenExpiredError') {
      // Intenta eliminar al usuario solo si el error es debido a que el token ha expirado.
      await userModel.deleteUser(decoded.email);
      res.status(403).send('Token de verificación expirado y el usuario ha sido eliminado.');
    } else {
      res.status(500).send('Error al verificar la cuenta.');
    }
  }
});


router.post('/login', async (req, res) => {
  const { nombre, contrasena } = req.body;

  try {
    const result = await pool.query("SELECT * FROM persona WHERE nombre = $1;", [nombre]);

    if (result.rows.length > 0) {
      const loginData = result.rows[0];

      // Verificar si el usuario está activo o verificado
      if (!loginData.is_verified) {
        return res.status(403).json({ message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico.' });
      }

      const isValid = await bcrypt.compare(contrasena, loginData.contrasena);

      if (isValid) {
        // Generar un código de verificación
        const verificationCode = crypto.randomBytes(3).toString('hex'); // Código de 6 caracteres

        // Guardar el código de verificación temporalmente en la base de datos
        await pool.query('UPDATE persona SET verification_code = $1, verification_code_expires = $2 WHERE nombre = $3', 
                         [verificationCode, new Date(Date.now() + 3 * 60000), nombre]); // El código expira en 3 minutos

        // Enviar el código de verificación por correo electrónico
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'testodoo51@gmail.com',
            pass: 'twbg mkea dfgq tbzl',
          },
        });

        const mailOptions = {
          to: loginData.email,
          from: 'GestioProgressio" <no-reply@gpmail.com>',
          subject: 'Verificacion de dos pasos',
          html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verificacion de dos pasos</title>
            <style>
              body {
                font-family: sans-serif;
                margin: 0;
                padding: 0;
              }
              .container {
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
                border-radius: 5px;
                background-color: #f5f5f5;
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
              }
              .content {
                padding: 20px;
              }
              .link {
                color: #007bff;
                text-decoration: none;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
              }
              .footer p{
                font-size: 1.2em;
                font-weight: bolder;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>GestioProgressio</h1>
                <h2>Verifique el acceso a su cuenta</h2>
              </div>
              <div class="content">
                <p>Su código de verificación es el siguiente:</p>
                <p><b>${verificationCode}</b></p>
                <br>
                <p>¡Saludos!</p>
              </div>
              <div class="footer">
                <p>GestioProgressio, Inc.</p>
              </div>
            </div>
          </body>
          </html>
          `
        };

        transporter.sendMail(mailOptions, (err) => {
          if (err) {
            console.error('Error al enviar correo:', err);
            return res.status(500).json({ message: 'Error al enviar correo' });
          }
          return res.status(200).json({ message: 'Código de verificación enviado a su correo electrónico.' });
        });
      } else {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }
    } else {
      return res.status(404).json({ message: 'Usuario no existe' });
    }
  } catch (err) {
    console.error('Error al iniciar sesion:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para verificar código de verificación al iniciar sesión
router.post('/verify-code', async (req, res) => {
  const { nombre, verificationCode } = req.body;

  try {
    console.log('Verificación iniciada para:', nombre);

    // Consulta para verificar el código de verificación
    const result = await pool.query("SELECT * FROM persona WHERE nombre = $1 AND verification_code = $2 AND verification_code_expires > NOW();", [nombre, verificationCode]);

    if (result.rows.length > 0) {
      const loginData = result.rows[0];
      console.log('Código de verificación válido para:', nombre);

      // Generar un JWT
      let token;
      try {
        token = jwt.sign(
          { id: loginData.personaid, nombre: loginData.nombre },
          JWT_SECRET,
          { expiresIn: '200s' } // Duración del token antes de volver a requerir una nueva verificación
        );
        console.log('Token generado para:', nombre);
      } catch (tokenError) {
        console.error('Error al generar el token:', tokenError);
        return res.status(500).send({ message: 'Error al generar el token' });
      }

      // Limpiar el código de verificación solo después de generar el token exitosamente
      try {
        await pool.query('UPDATE persona SET verification_code = NULL, verification_code_expires = NULL WHERE nombre = $1', [nombre]);
        console.log('Código de verificación limpiado para:', nombre);
      } catch (updateError) {
        console.error('Error al limpiar el código de verificación:', updateError);
        return res.status(500).send({ message: 'Error al limpiar el código de verificación' });
      }

      // Devolver el token y mensaje de éxito
      return res.json({ message: 'Autenticación exitosa.', token });
    } else {
      console.log('Código de verificación inválido o expirado para:', nombre);
      return res.status(400).send({ message: 'Código de verificación inválido o expirado' });
    }
  } catch (err) {
    console.error('Error al verificar el código:', err);
    return res.status(500).send({ message: 'Error interno del servidor', error: err });
  }
});


//Endpoint refrescar token de sesion
router.post('/refresh-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).send({ message: 'Token no proporcionado' });
  }

  try {
    // Verifica el token existente
    const decoded = jwt.verify(token, JWT_SECRET);

    // Si el token es válido pero está cerca de expirar, emite uno nuevo
    const newToken = jwt.sign(
      { id: decoded.id, nombre: decoded.nombre },
      JWT_SECRET,
      { expiresIn: '100s' } // Renueva el token por otros 200 segundos
    );

    return res.json({ message: 'Token refrescado exitosamente.', token: newToken });
  } catch (error) {
    // Si el token es inválido o ha expirado
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).send({ message: 'Token expirado' });
    } else {
      return res.status(500).send({ message: 'Error al verificar el token' });
    }
  }
});


// Recuperar contraseña
// Endpoint para actualizar la contraseña
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    const result = await pool.query('SELECT * FROM persona WHERE reset_passwd_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).send({ message: 'Token inválido o expirado'});
    }
    const user = result.rows[0];
    const now = new Date();
    if (now > user.reset_passwd_expires) {
      await pool.query('UPDATE persona SET reset_passwd_token = NULL, reset_passwd_expires = NULL WHERE reset_passwd_token = $1', [token]);
      return res.status(400).send({ message: 'Token inválido o expirado'});
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE persona SET contrasena = $1, reset_passwd_token = NULL, reset_passwd_expires = NULL WHERE reset_passwd_token = $2', [hashedPassword, token]);
    return res.status(200).send({ message: 'Contraseña actualizada correctamente'});
  } catch (err) {
    console.error('Error al actualizar contraseña:', err);
    return res.status(500).send({ message: 'Error al actualizar contraseña'});
  }
});

// Endpoint para verificar el token de restablecimiento de contraseña
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query('SELECT * FROM persona WHERE reset_passwd_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(400).send('<h1>Token inválido o expirado</h1>');
    }
    const user = result.rows[0];
    const now = new Date();
    if (now > user.reset_passwd_expires) {
      await pool.query('UPDATE persona SET reset_passwd_token = NULL, reset_passwd_expires = NULL WHERE reset_passwd_token = $1', [token]);
      return res.status(400).send('<h1>Token inválido o expirado</h1>');
    }
    // Redirigir al frontend
    return res.redirect(`/reset-password/${token}`);
  } catch (err) {
    console.error('Error al verificar token:', err);
    res.status(500).send('<h1>Error al verificar token</h1>');
  }
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
    const consulta = await pool.query('SELECT * FROM Persona WHERE jefeid = $1', [Number(id)]);
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

// Buscar un solo empleado
router.get('/personal/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if(id){
      const consulta = await pool.query('SELECT personaid,nombre,email,jefeid,empresaid,roles FROM Persona WHERE empresaid=$1 AND is_verified=true',[id]);
      return res.status(201).json({ 'data': consulta.rows });
    }
    return res.status(500).json({ 'error': 'El ID ingresado no es valido' });
  } catch (error) {
    return res.status(500).json({ 'error': error.message });
  }
});

// Buscar solo empleados con el rol de Proyect Manager
router.get('/pm/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if(id){
      const consulta = await pool.query('SELECT personaid,nombre,email,jefeid,empresaid,roles FROM Persona WHERE empresaid=$1 AND is_verified=true AND roles=\'Proyect Manager\'',[id]);
      return res.status(201).json({ 'data': consulta.rows });
    }
    return res.status(500).json({ 'error': 'El ID ingresado no es valido' });
  } catch (error) {
    return res.status(500).json({ 'error': error.message });
  }
});

// Buscar un solo empleado
router.get('/persona/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if(id){
      const consulta = await pool.query('SELECT personaid,nombre,email,jefeid,empresaid,roles FROM Persona WHERE personaid=$1',[id]);
      return res.status(201).json({ 'data': consulta.rows });
    }
    return res.status(500).json({ 'error': 'El ID ingresado no es valido' });
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




module.exports = router;