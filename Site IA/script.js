/* =========================
   MODE SOMBRE
========================= */


const darkBtn = document.getElementById("darkmode");


darkBtn.addEventListener("click", () => {


    document.body.classList.toggle("dark");


    if(document.body.classList.contains("dark")){

        darkBtn.textContent = "☀️";

        localStorage.setItem(
            "theme",
            "dark"
        );

    }

    else{

        darkBtn.textContent = "🌙";

        localStorage.setItem(
            "theme",
            "light"
        );

    }


});



/* Charger le thème sauvegardé */


if(localStorage.getItem("theme") === "dark"){


    document.body.classList.add("dark");

    darkBtn.textContent="☀️";


}







/* =========================
   COMPTEUR LECTEURS LIVE
========================= */


const readers =
document.getElementById("readers");


let count = 1842;



function updateReaders(){


    let change =
    Math.floor(Math.random()*20)-8;



    count += change;



    if(count < 1200){

        count = 1200;

    }



    if(count > 2500){

        count = 2500;

    }



    readers.textContent =
    count.toLocaleString("fr-FR");


}



setInterval(
    updateReaders,
    3000
);








/* =========================
   ANIMATION STATISTIQUES
========================= */


const numbers =
document.querySelectorAll("[data-number]");



let activated = false;



function animateNumbers(){


    if(activated) return;



    const stats =
    document.querySelector(".stats");



    const position =
    stats.getBoundingClientRect().top;



    if(position < window.innerHeight - 100){


        activated = true;



        numbers.forEach(number => {



            let target =
            Number(number.dataset.number);



            let current = 0;



            let speed =
            target / 100;



            let timer =
            setInterval(()=>{



                current += speed;



                if(current >= target){


                    current = target;


                    clearInterval(timer);

                }



                if(target > 1000){


                    number.textContent =
                    Math.floor(current)
                    .toLocaleString("fr-FR");


                }

                else{


                    number.textContent =
                    Math.floor(current) + "%";


                }



            },20);



        });



    }


}



window.addEventListener(
    "scroll",
    animateNumbers
);








/* =========================
   APPARITION DES BLOCS
========================= */


const cards =
document.querySelectorAll(
".card, .comment, .article"
);



const observer =
new IntersectionObserver(
(entries)=>{


entries.forEach(entry=>{


    if(entry.isIntersecting){


        entry.target.classList.add(
            "show"
        );


    }



});


},
{
    threshold:0.15
});



cards.forEach(card=>{


    card.classList.add(
        "hidden"
    );


    observer.observe(card);


});







/* =========================
   BARRE DE LECTURE
========================= */


const progress =
document.createElement("div");


progress.id =
"reading-progress";


document.body.appendChild(progress);



window.addEventListener(
"scroll",
()=>{


    const scroll =
    document.documentElement.scrollTop;



    const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;



    const percent =
    (scroll / height) * 100;



    progress.style.width =
    percent + "%";



});







/* =========================
   NEWSLETTER FAKE
========================= */


const newsletter =
document.querySelector(
".newsletter button"
);



if(newsletter){


newsletter.addEventListener(
"click",
()=>{


newsletter.innerHTML =
"Inscription confirmée 🌱";


newsletter.disabled =
true;


});


}







console.log(
"FlashNews chargé - Site satirique fictif"
);