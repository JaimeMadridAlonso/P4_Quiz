const readline = require("readline");
const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");
const Sequelize = require('sequelize');

//Muestra la ayuda
exports.helpCmd = rl => {
  		console.log("Comandos:");
  		console.log("	h|help - Muestra esta ayuda.");
  		console.log("	list - Listar los quizzes existentes.");
  		console.log("	show <id> - Muestra la pregunta y respuesta del quiz indicado");
  		console.log("	add - Añadir un nuevo quiz interactivamente.");
  		console.log("	delete <id> - Borrar el quiz indicado.");
  		console.log("	edit <id> - Editar el quiz indicado.");
  		console.log("	test <id> - Probar el quiz indicado.");
  		console.log("	p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  		console.log("	credits - Créditos.");
  		console.log("	q|quit - Salir del programa.");
  		rl.prompt();
};

exports.quitCmd = rl => {
	rl.close();
	rl.prompt();
};


const makeQuestion = (rl, text) => {
    return new Sequelize.Promise ((resolve,reject) => {
        rl.question(colorize(text +' ' , 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


exports.addCmd = rl => {
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
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.listCmd = rl => {

models.quiz.findAll()
.each(quiz => {
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
})
.catch(error => {
    errorlog(error.message);
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

exports.showCmd = (rl,id) => {
    validateId(id)
    .then(id => models.quiz.findById(id)) //busca el quiz de ese id
    .then(quiz => {
        if (!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);           
    })
    .catch(error=>{
        errorlog(error.message);
    })
    .then(()=> {
        rl.prompt();
    });
};

exports.testCmd = (rl, id) => {
validateId(id) //valido el id
    .then(id => models.quiz.findById(id)) //busco el id q quiero probar
    .then(quiz => {
        if (!quiz) { 
            throw new Error (`No existe un quiz asociado al id=${id}.`);
        }
        makeQuestion(rl, quiz.question)
        .then( a => {
                if(quiz.answer === a){
                    log('Su respuesta es correcta.');
                    biglog('Correcta', 'green');
                }else{
                    log('Su repuesta es incorrecta.');
                    biglog('Incorrecta','red');
                    }
                });
        })
        .catch(Sequelize.ValidationError, error => {
        errorlog("El quiz es erróneo: ");
        error.errors.forEach(({ message }) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.playCmd = rl => {	
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
        log("No hay preguntas disponibles");
        log(`Tu score es '${score}'`);
        rl.prompt();
        }else if(score === paraFinalizar){
            log(`Enhorabuan. Has acertado todas las preguntas. Tu score es ${score}.`);
            biglog(`${score}`);
            rl.prompt();
            }else{
            let randomId = Math.floor(Math.random() * toBeResolved.length);
            let quiz = toBeResolved[randomId];
            makeQuestion(rl, quiz.question)
            .then (answer => {
                if (answer === quiz.answer){
                score=score+1;
                log(`CORRECTO - Lleva '${score}' aciertos.`);
                toBeResolved.splice(randomId, 1);
                playOne();
                }else{    
                log("INCORRECTO.");
                log(`Fin del juego. Aciertos: '${score}'`);
                rl.prompt();
                    }
                })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
    }
}
        playOne();
});
};
exports.deleteCmd = (rl, id) => {
    validateId(id) 
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.editCmd = (rl, id) => {
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
        log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')}: por: ${quiz.question} ${colorize('=>', 'magenta' )} ${quiz.answer}`);        
    })
    .catch(Sequelize.ValidationError, error =>{
        errorlog('El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


exports.creditsCmd = rl => {
	console.log("Autores de la práctica: ");
    console.log("Jaime Madrid Alonso");
    rl.prompt();
};