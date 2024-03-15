import React from "react"
import { useNavigate } from "react-router-dom";

const Home = (props) => {
    const { loggedIn, email } = props
    const navigate = useNavigate();
    
    const onButtonClick = () => {
        if (loggedIn) {
            localStorage.removeItem("user")
            props.setLoggedIn(false)
        } else {
            navigate("/login")
        }
    }

    const signUpClick = () => {
        if (loggedIn) {
            localStorage.removeItem("user")
            props.setLoggedIn(false)
        } else {
            navigate("/signUp")
        }
    }


    return <div className="mainContainer">
        <div className={"titleContainer"}>
            <div>Welcome to Book.net!</div>
        </div>
        <div>
            This is the home page.
        </div>
        <div className={"buttonContainer"}>
            <input
                className={"inputButton"}
                type="button"
                onClick={onButtonClick}
                value={loggedIn ? "Log out" : "Log in"} />
            {(loggedIn ? <div>
                Your email address is {email}
            </div> : <div/>)}

            <input
                className={"inputButton"}
                type="button"
                onClick={signUpClick}
                value={loggedIn ? "Log out" : "Sign Up"} />
            {(loggedIn ? <div>
                Your email address is {email}
            </div> : <div/>)}
        </div>



    </div>
}

export default Home