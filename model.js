
const fs = require ("fs");

//Nombre del fichero donde se guardan las preguntas
const DB_FILENAME = "quizzes.json";

//Modelo de datos
//Variable que tiene todos los quizzes
let quizzes = [
	{
		question: "Capital de Italia",
		answer: "Roma"
	},
	{
		question: "Capital de Francia",
		answer: "París"
	},
		{
		question: "Capital de España",
		answer: "Madrid"
	},
		{
		question: "Capital de Portugal",
		answer: "Lisboa"
	}
];


//Carga el contenido de DB_FILENAME en la variable quizzes
const load = () => {

	fs.readFile(DB_FILENAME, (err, data) =>{
		if (err){
			//La 1 vez no existe el fichero
			if(err.code === "ENOENT"){
				save(); //valores iniciales
				return;
			}
			throw err;
		}
		let json = JSON.parse(data);
		if(json){
			quizzes = json;
		}
	});
};


//Guarda las preguntas en el fichero
const save = () => {
	fs.writeFile(DB_FILENAME,
		JSON.stringify(quizzes),
		err => {
			if(err) throw err;
		});
};


exports.count = () => quizzes.length;

//Añade un nuevo quiz
exports.add = (question, answer) => {

	quizzes.push({
		question: (question || "").trim(),
		answer: (answer || "").trim()
	});
	save();
};

//Actualiza un quizz en la posición id
exports.update = (id, question, answer) => {

	const quiz = quizzes[id];
	if (typeof quiz === "undefined"){
		throw new Error(`El valor del parámetro id no es válido.`);
	}
	quizzes.splice(id, 1, {
		question: (question || "").trim(),
		answer: (answer || "").trim()
	});
	save();
};

//Devuelve todos los elementos del array
exports.getAll = () => JSON.parse(JSON.stringify(quizzes));

//Devuelve un coln del quiz almacenado en id
exports.getByIndex = id => {
	const quiz = quizzes[id];
	if (typeof quiz === "undefined"){
		throw new Error(`El valor del parámetro id no es válido.`);
	}
	return JSON.parse(JSON.stringify(quiz));
};

exports.deleteByIndex = id => {

	const quiz = quizzes[id];
	if (typeof quiz === "undefined"){
		throw new Error(`El valor del parámetro id no es válido.`);
	}
	quizzes.splice(id,1);
	save();
};

//Carga los quizzes en el fichero
load();