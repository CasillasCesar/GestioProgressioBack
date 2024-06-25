
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Proyect_manager',
  password: 'admin',
  port: 5432,
});

export class UserModel {
  async createUser(userData) {
    const client = await pool.connect();
    try {
      console.log(102);
      if (!userData.contrasena_usuario){
        throw new Error("El campo no debe estar vacio");
      }
      const hashedPassword = await bcrypt.hash(userData.contrasena_usuario, 10);
      
      // Buscamos si es que existe la empresa registrada
      console.log('abajo');
      const r = await client.query('SELECT * FROM empresa WHERE empresaid = $1',[empresa_id]) 
      console.log(r);
      console.log('arriba');

      const result = await client.query(
        'INSERT INTO usuarios (nombre, correo, contrasena, verification_token, token_expires) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
        [userData.nombre_usuario, userData.correo_usuario, hashedPassword, userData.verification_token, userData.token_expires]
      );
      return result.rows[0];
    } catch (error){
      throw error;
    } finally {
      client.release();
    }
  }

  async createPendingUser({ nombre_usuario, correo_usuario, contrasena_usuario, verificationToken, tokenExpires }) {
    const client = await pool.connect();
    try {
      // Inserta el usuario en la base de datos con el token de verificación y la fecha de expiración
      await client.query('INSERT INTO usuarios (nombre_usuario, correo_usuario, contrasena_usuario, verification_token, token_expires, is_verified) VALUES ($1, $2, $3, $4, $5, false)', 
      [nombre_usuario, correo_usuario, contrasena_usuario, verificationToken, tokenExpires]);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async activateUser(correo_usuario) {
    const client = await pool.connect();
    try {
      const result = await client.query('UPDATE usuarios SET is_verified = true WHERE correo_usuario = $1 AND is_verified = false RETURNING *', [correo_usuario]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findUserByUsername(nombre_usuario) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM usuarios WHERE nombre_usuario = $1;', [nombre_usuario]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findByEmail(correo_usuario){
    const client = await pool.connect();
    try{
      const result = await client.query('SELECT * FROM usuarios WHERE correo_usuario = $1;', [correo_usuario]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findEmpresa(empresa_id){
    const client = await pool.connect();
    try{
      const result = await client.query('SELECT * FROM empresa WHERE access_token = $1;', [empresa_id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateUser(id_usuario, userData) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE usuarios SET nombre_usuario = $1, correo_usuario = $2 WHERE id_usuario = $3 RETURNING *;',
        [userData.nombre_usuario, userData.correo_usuario, id_usuario]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteUser(correo_usuario) {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM usuarios WHERE correo_usuario = $1;', [correo_usuario]);
      return result.rowCount; // rowCount será 1 si se eliminó el usuario, 0 si no se encontró
    } finally {
      client.release();
    }
  }
}

module.exports = UserModel;
