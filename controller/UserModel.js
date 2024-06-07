
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Proyect_manager',
  password: 'nks123',
  port: 5432,
});

class UserModel {
  async createUser(userData) {
    const client = await pool.connect();
    try {
      if (!userData.contrasena_usuario){
        throw new Error("El campo no debe estar vacio");
      }
      const hashedPassword = await bcrypt.hash(userData.contrasena_usuario, 10);
      const result = await client.query(
        'INSERT INTO usuarios (nombre_usuario, correo_usuario, contrasena_usuario) VALUES ($1, $2, $3) RETURNING *;',
        [userData.nombre_usuario, userData.correo_usuario, hashedPassword]
      );
      return result.rows[0];
    } catch (error){
      throw error;
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

  async deleteUser(id_usuario) {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM usuarios WHERE id_usuario = $1;', [id_usuario]);
      return result.rowCount; // rowCount será 1 si se eliminó el usuario, 0 si no se encontró
    } finally {
      client.release();
    }
  }
}

module.exports = UserModel;
