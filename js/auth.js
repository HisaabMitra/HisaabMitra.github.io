const btnlogin = document.getElementById("btnlogin");

btnlogin.addEventListener("click", function(){

    let username = document.getElementById("txtusername").value;
    let password = document.getElementById("txtpassword").value;

    if(username === "admin" && password === "1234"){

        localStorage.setItem("login", "yes");
        localStorage.setItem("username", username);

        window.location.href = "../index.html";

    }
    else{
        document.getElementById("msg").innerHTML = "Invalid Username or Password";
        document.getElementById("msg").style.color = "red";
    }

});
