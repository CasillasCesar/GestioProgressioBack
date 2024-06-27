
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres.fqxbxkwjdecasjtcqtly',
  host: 'aws-0-us-east-1.pooler.supabase.com',
  database: 'Proyect_manager',
  password: '>B*qW>qjtncm2~c',
  port: 6543,
});

class UserModel {
  async createUser(userData) {
    const client = await pool.connect();
    try {
      console.log(102);
      if (!userData.contrasena){
        throw new Error("El campo no debe estar vacio");
      }
      const hashedPassword = await bcrypt.hash(userData.contrasena, 10);
      
      // Buscamos si es que existe la empresa registrada
      // console.log('abajo');
      // const r = await client.query('SELECT * FROM empresa WHERE empresaid = $1',[empresa_id]) 
      // console.log(r);
      // console.log('arriba');

      const result = await client.query(
        'INSERT INTO persona (nombre, correo, contrasena, verification_token, token_expires) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
        [userData.nombre, userData.email, hashedPassword, userData.verification_token, userData.token_expires]
      );
      return result.rows[0];
    } catch (error){
      throw error;
    } finally {
      client.release();
    }
  }

  async createPendingUser({ nombre, email, contrasena, verificationToken, tokenExpires, empresa_id }) {
    const client = await pool.connect();
    console.log(empresa_id);
    try {
      console.log(`INSERT INTO persona (nombre, email, contrasena, verification_token, token_expires,empresaid,is_verified) VALUES (${nombre}, ${email}, ${contrasena}, ${verificationToken}, ${tokenExpires}, ${empresa_id},false)`);
      // Inserta el usuario en la base de datos con el token de verificación y la fecha de expiración
      await client.query('INSERT INTO persona (nombre, email, contrasena, verification_token, token_expires,empresaid,is_verified) VALUES ($1, $2, $3, $4, $5,$6 , false)', 
      [nombre, email, contrasena, verificationToken, tokenExpires , empresa_id]);
    } catch (error) {
      console.log("Aqui");
      throw error;
    } finally {
      client.release();
    }
  }

  async activateUser(email) {
    const client = await pool.connect();
    try {
      const result = await client.query('UPDATE persona SET is_verified = true WHERE email = $1 AND is_verified = false RETURNING *', [email]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findUserByUsername(nombre) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM persona WHERE nombre = $1;', [nombre]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findByEmail(email){
    const client = await pool.connect();
    try{
      const result = await client.query('SELECT * FROM persona WHERE email = $1;', [email]);
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
        'UPDATE persona SET nombre = $1, email = $2 WHERE personaid = $3 RETURNING *;',
        [userData.nombre, userData.email, id_usuario]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteUser(email) {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM persona WHERE email = $1;', [email]);
      return result.rowCount; // rowCount será 1 si se eliminó el usuario, 0 si no se encontró
    } finally {
      client.release();
    }
  }
}

module.exports = UserModel;
