// Applies the saved light/dark choice before the page paints.
try{var t=JSON.parse(localStorage.getItem('nbel-theme'));if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}
