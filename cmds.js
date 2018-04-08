const readline = require("readline");
const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");
const Sequelize = require('sequelize');

//Muestra la ayuda
exports.helpCmd = (socket, rl) => {
  		console.log(socket, "Comandos:");
  		console.log(socket, "	h|help - Muestra esta ayuda.");
  		console.log(socket, "	list - Listar los quizzes existentes.");
  		console.log(socket, "	show <id> - Muestra la pregunta y respuesta del quiz indicado");
  		console.log(socket, "	add - Añadir un nuevo quiz interactivamente.");
  		console.log(socket, "	delete <id> - Borrar el quiz indicado.");
  		console.log(socket, "	edit <id> - Editar el quiz indicado.");
  		console.log(socket, "	test <id> - Probar el quiz indicado.");
  		console.log(socket, "	p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  		console.log(socket, "	credits - Créditos.");
  		console.log(socket, "	q|quit - Salir del programa.");
  		rl.prompt();
};

exports.quitCmd = (socket, rl) => {
	rl.close();
	socket.end();
};


const makeQuestion = (socket, rl, text) => {
    return new Sequelize.Promise ((resolve,reject) => {
        rl.question(colorize(text +' ' , 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


exports.addCmd = (socket, rl) => {
    makeQuestion (rl, 'Introduzca una pregunta: ')
    .then(q => { //parametro la pregunta q metes
        return makeQuestion(rl, 'Introduzca la respuesta: ')
        .then( a =>{ //parametro la respuesta q metes
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz); //creas la quiz con q y a
    })
    .then((quiz) => {    
        log(` ${colorize('Se han añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.listCmd = (socket, rl) => {

models.quiz.findAll()
.each(quiz => {
        log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
})
.catch(error => {
    errorlog(socket, error.message);
})
.then(() => {
    rl.prompt();
});
};

const validateId = id => {
    return new Sequelize.Promise ((resolve,reject) => {
        if (typeof id === "undefined"){
            reject(new Error(`Falta el parametro <id>.`));
        }else{
            id = parseInt(id); //lo convierto en un numero
            if (Number.isNaN(id)){
                reject(new Error(`El valor del parametro <id> no es un número`));
            }else{
                resolve(id);
            }
        }
        
    });
};

exports.showCmd = (socket, rl,id) => {
    validateId(id)
    .then(id => models.quiz.findById(id)) //busca el quiz de ese id
    .then(quiz => {
        if (!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);           
    })
    .catch(error=>{
        errorlog(socket, error.message);
    })
    .then(()=> {
        rl.prompt();
    });
};

exports.testCmd = (socket, rl, id) => {
validateId(id) //valido el id
    .then(id => models.quiz.findById(id)) //busco el id q quiero probar
    .then(quiz => {
        if (!quiz) { 
            throw new Error (`No existe un quiz asociado al id=${id}.`);
        }
        makeQuestion(rl, quiz.question)
        .then( a => {
                if(quiz.answer === a){
                    log(socket, 'Su respuesta es correcta.');
                    biglog(socket, 'Correcta', 'green');
                }else{
                    log(socket, 'Su repuesta es incorrecta.');
                    biglog(socket, 'Incorrecta','red');
                    }
                });
        })
        .catch(Sequelize.ValidationError, error => {
        errorlog(socket, "El quiz es erróneo: ");
        error.errors.forEach(({ message }) => errorlog(message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.playCmd = (socket, rl) => {	
    let score = 0;
    let toBeResolved = [];
    models.quiz.findAll()
        .then(quizzes => {
            quizzes.forEach((quiz, id) => {
            toBeResolved[id] = quiz;
        });

    let paraFinalizar = toBeResolved.length;

    const playOne = () => {
        if (toBeResolved.lenght === 0){
        log(socket, "No hay preguntas disponibles");
        log(socket, `Tu score es '${score}'`);
        rl.prompt();
        }else if(score === paraFinalizar){
            log(socket, `Enhorabuan. Has acertado todas las preguntas. Tu score es ${score}.`);
            biglog(socket, `${score}`);
            rl.prompt();
            }else{
            let randomId = Math.floor(Math.random() * toBeResolved.length);
            let quiz = toBeResolved[randomId];
            makeQuestion(rl, quiz.question)
            .then (answer => {
                if (answer === quiz.answer){
                score=score+1;
                log(socket, `CORRECTO - Lleva '${score}' aciertos.`);
                toBeResolved.splice(randomId, 1);
                playOne();
                }else{    
                log(socket, "INCORRECTO.");
                log(socket, `Fin del juego. Aciertos: '${score}'`);
                rl.prompt();
                    }
                })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
    }
}
        playOne();
});
};
exports.deleteCmd = (socket, rl, id) => {
    validateId(id) 
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.editCmd = (socket, rl, id) => {
    validateId(id) 
    .then(id => models.quiz.findById(id)) //busco el id q quiero editar
    .then(quiz => {
        if (!quiz) { 
            throw new Error (`No existe un quiz asociado al id=${id}.`);
        }
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, 'Introduzca la pregunta: ') 
        .then (q => {
            process.stdout.isTTY && setTimeout (() => {rl.write(quiz.answer)}, 0);
            return makeQuestion(rl, 'Introduzca la respuesta: ') 
            .then (a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz; 
            });
        });
    })
    .then(quiz => {
        return quiz.save ();
    })
    .then (quiz => {
        log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')}: por: ${quiz.question} ${colorize('=>', 'magenta' )} ${quiz.answer}`);        
    })
    .catch(Sequelize.ValidationError, error =>{
        errorlog(socket, 'El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


exports.creditsCmd = (socket, rl) => {
	console.log(socket, "Autores de la práctica: ");
    console.log(socket, "Jaime Madrid Alonso");
    rl.prompt();
};