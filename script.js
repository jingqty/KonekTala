async function loadMap() {
    
    let maps = {
        north: 'northStarMap.svg',
        south: 'southStarMap.svg'
    };

    let currentMap = maps.north;
    let northMap = true;   //default on Northern Sky

    async function renderMap(file) {
        let response = await fetch(currentMap);
        let svgCode = await response.text();
        document.getElementById('spin-wrapper').innerHTML = svgCode;

        loadSVG(); // rebind the interactionss
    }

    function loadSVG() {
        const svg = document.querySelector('#spin-wrapper svg');
        if(!svg) return;

        svg.addEventListener("click", nameConstellation);

        //unhighlight everything then highlight selected constellation in gold
        document.querySelectorAll('#constellations > g').forEach(function(g){
        g.addEventListener('click', function(){
            document.querySelectorAll('#constellations > g').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
        })
        })
    }

    //first load
    await renderMap(currentMap);

    const mapToggle = document.getElementById('map-button')

    mapToggle.addEventListener("click", async function(){
        selected = null;
        document.getElementById("info").innerHTML = 'Click a constellation on the map to explore';


        if(northMap) {
        //switch northStarMap to southStarMap.svg
        currentMap = maps.south
        northMap = false;
        //title to Southern Sky
        document.getElementById("title-name").innerHTML = 'THE SOUTHERN SKY';

        mapToggle.classList.remove('fa-n')
        mapToggle.classList.add('fa-s')

        } else {
        currentMap = maps.north
        northMap = true;
        //title to Northern Sky
        document.getElementById("title-name").innerHTML = 'THE NORTHERN SKY';
        
        mapToggle.classList.remove('fa-s')
        mapToggle.classList.add('fa-n')

        }
        //reload on toggle
        fadeTransition();

    })

    //fade between sky load
    function fadeTransition(){
        const targets = [...document.querySelectorAll('#constellations > g'), document.getElementById('Labels')].filter(Boolean);
        targets.forEach(g => {
        g.style.transition = `opacity ${0.3 + Math.random() * 0.5}s`;
        g.style.transitionDelay = `${Math.random() * 0.8}s`;
        g.style.opacity = '0';
        });

        setTimeout(async () => {
        await renderMap(currentMap);
        const newTargets = [...document.querySelectorAll('#constellations > g'), document.getElementById('Labels')].filter(Boolean);
        newTargets.forEach(g => {
            g.style.transition = 'none';
            g.style.opacity = '0';
        });
        requestAnimationFrame(() => {
            newTargets.forEach(g => {
            g.style.transition = `opacity ${0.3 + Math.random() * 0.5}s`;
            g.style.transitionDelay = `${Math.random() * 0.8}s`;
            g.style.opacity = '1';
            });
        });
        }, 1200);
    }
    

    let selected; //chosen clicked constellation
    
    function nameConstellation(e) {
        const constellation = e.target.closest('#constellations > g'); //grab the id of the direct child of the constellations
        if (constellation) {
        selected = constellation;
        cancelAnimationFrame(trackFrame);
        trackConstellation();
        name = constellation.id
        document.getElementById("title-name").innerHTML = selected.id;
        loadWiki(name);
        } else {
        selected = null;
        cancelAnimationFrame(trackFrame);
        const svg = document.querySelector('#spin-wrapper svg');
        if (svg) svg.setAttribute('viewBox', '0 0 2000 2000');
        document.getElementById("title-name").innerHTML = northMap ? 'THE NORTHERN SKY' : 'THE SOUTHERN SKY';  //shortcut na if-else
        document.getElementById("info").innerHTML = 'Click a constellation on the map to explore';
        }
    }
    
    let trackFrame;
    
    function trackConstellation(){
        const svg = document.querySelector('#spin-wrapper svg');
        if (!svg) return;
        //console.clear();
        if(selected){
        const box = selected.getBBox();
        const pad = 100;
        svg.setAttribute('viewBox', `${box.x-pad} ${box.y-pad} ${box.width + pad*2} ${box.height+ pad*2}`);

        trackFrame=requestAnimationFrame(trackConstellation);
        }
    }



    //use opensearch api to scrape and return wikipedia data
    async function loadWiki(name) {
        const baseName = name.replace(/_/g, ' ');
        const queries = [
            baseName + ' constellation',
            baseName,
            baseName + ' (constellation)'
        ];

        for (const search of queries) {
            const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(search)}&limit=1&format=json&origin=*`);
            const searchData = await searchRes.json();
            const title = searchData[1][0];

            if (title) {
                const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
                const data = await res.json();
                if (data.extract) {
                    document.getElementById("info").innerText = data.extract;
                    return;
                }
            }
        }

        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(baseName + ' constellation')}&format=json&no_html=1&skip_disambig=1`);
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) {
            document.getElementById("info").innerText = ddgData.AbstractText;
        } else {
            document.getElementById("info").innerText = 'No info found';
        }
    }

    const canvas = document.getElementById('background');
    const ctx = canvas.getContext('2d');  //sets to draw on canva 2d
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    fetch('hyg_v42.csv')
    .then(r => r.text())
    .then(csv => {
        const rows = csv.split('\n').map(row => row.split(','));   //split into rows and columns
        
        const rightAscension = 7; // x coord
        const declination = 8; //y-coord
        const mag = 13; //brightness
        const ci = 16; // color
        
        const xCoords = rows.slice(1).map(row => (Number(row[rightAscension]) / 24));
        const yCoords = rows.slice(1).map(row => 1 - ((Number(row[declination]) + 90) / 180));
        const radius = rows.slice(1).map(row => Math.max(0.4, (5.5 - Number(row[mag])) * 0.35));
        const starColor = rows.slice(1).map(row =>(Number(row[ci])));
        
        function drawStars(){
        ctx.fillStyle = 'black';       //BACKGROUND COLOR
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for(let i = 0; i < xCoords.length; i++) {
            if(isNaN(xCoords[i]) || isNaN(yCoords[i]) || isNaN(radius[i])) continue; //filter out null cells
            if(radius[i] <= 0) continue; //filter out no radius

            const magValue = Number(rows[i + 1][mag]); //gets the magnitude/brightness
            if (magValue > 5.5 || magValue < -5) continue; // set brightness threshold, too many stars

            if (isNaN(starColor[i])) {
            ctx.fillStyle = 'rgb(220, 235, 255)';  //bluish white NaN defaule
            } else if (starColor[i] < 0.0) {
            ctx.fillStyle = 'rgb(180, 210, 255)';  //blue
            } else if (starColor[i] < 0.3) {
            ctx.fillStyle = 'rgb(220, 235, 255)';  //bluish white
            } else if (starColor[i] < 0.6) {
            ctx.fillStyle = 'rgb(255, 255, 255)';   //white
            } else if (starColor[i] < 1.0) {
            ctx.fillStyle = 'rgb(255, 245, 180)';  // ivory (yellowish white)
            } else if (starColor[i] < 1.4) {
            ctx.fillStyle = 'rgb(255, 200, 100)';  //orange
            } else {
            ctx.fillStyle = 'rgb(255, 150, 80)';  //reddish
            }

            const x = xCoords[i] * canvas.width;
            const y = yCoords[i] * canvas.height;
    
            ctx.beginPath();
            ctx.arc(x, y, radius[i], 0, Math.PI * 2); //draw the stars
            ctx.fill();
        }
    }

        drawStars();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawStars();
    });
        
    });

    //SETTINGS
    const playback = document.getElementById('play-button');
    const spinWrapper = document.getElementById('spin-wrapper');
    const labelButton = document.getElementById('label-button');
    let labelsGroup;

    let mapRotating = true;
    let labelsVisible = true;

    playback.addEventListener('click', () => {
        if (mapRotating) {
        spinWrapper.style.animationPlayState = 'paused';   //map rotates begin with ,when clicked gets paused
        playback.classList.remove('fa-pause');  //change icon to play
        playback.classList.add('fa-play');
        mapRotating = false               //the map is now not rotating
        } else {           
        spinWrapper.style.animationPlayState = 'running';  //maps is paused
        playback.classList.remove('fa-play')
        playback.classList.add('fa-pause');  // change icon to pause
        mapRotating = true
        }
    });
    
    labelButton.addEventListener('click', () => {
        labelsGroup = document.getElementById('Labels');
        
        if (!labelsGroup) return;

        if (labelsVisible) {
        labelsGroup.style.display = 'none';
        labelButton.style.opacity = '0.3';
        labelsVisible = false;
        } else {
        labelsGroup.style.display = '';
        labelButton.style.opacity = '1';
        labelsVisible = true;
        }
    });

    trackConstellation();

    }
    
loadMap();
    
