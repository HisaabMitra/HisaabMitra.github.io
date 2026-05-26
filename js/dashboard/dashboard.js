let username = localStorage.getItem("username");

if(username){
    document.getElementById("username").innerHTML = username;
}
