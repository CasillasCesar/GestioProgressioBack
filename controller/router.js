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
// const client = new Client();
router.get(
    '/conection',
    async (req,res)=>{
        try {
            console.log('entro');
            const consulta = await pool.query('INSERT INTO');
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



module.exports = router;