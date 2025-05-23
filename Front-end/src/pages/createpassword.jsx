import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../app/user/userSlice'; // Adjust the import path
import { useNavigate } from "react-router-dom";
import { signinSuccess,signout} from '../app/user/userSlice';
const apiUrlC = import.meta.env.VITE_API_BASE_URL;


const Spinner = () => (
  <div className="loader">Loading...</div>
);

function CreatePassword() {
  const [formData, setFormData] = useState({ password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for toggling password visibility
  const currentUser = useSelector(selectCurrentUser); // Get user data from Redux
  const dispatch = useDispatch();
  const navigate = useNavigate();



  dispatch(signout);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);



    // Prepare data to send to your backend
    const userData = {
      ...currentUser, // Spread currentUser data
      password: formData.password, // Add password
      // email:formData.email,
    };

    try {


      const response = await fetch(`${apiUrlC}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData), // Send the combined data
      });

      if (response.ok) {
        console.log("User data sent successfully!");

     
        setTimeout(() => {
          dispatch(signout);
      }, 2000); // 5000 ms = 5 seconds


        
        navigate('/signin'); // Navigate to the main program

      } else {

        const errorData = await response.json();
        console.error("Failed to send user data:", response.statusText, errorData);

        // need add error in below form if user password has any error
      }
    } catch (error) {
      console.error("Error during signup:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen  dark:bg-gray-800">
      {/* Left section for comments */}
      <div className="flex-1 flex items-center justify-center ">
        <div className="p-6">
          <span className='text-[100px] font-extrabold text-gray-400 hover:text-emerald-500 '>Blago</span>
          <p className='text-sm text-gray-400 left-5 hover:text-emerald-500 '>"Meet Blago: Your go-to AI writing assistant! Get instant answers, seamlessly transfer search results, and effortlessly rewrite sentences. Create and export documents in seconds—perfect for eBooks, research, and interviews. Streamline your resumes and cover letters with ease. Experience writing like never before with Blago!"</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-base font-extralight mb-2">Create an Account from Google Credentials</h2>
          <div className="mb-5">
            <label 
              htmlFor="email" 
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Your Email
            </label>
            <input
              type="text"
              id="email"
              value={currentUser.email} // Display email from Redux
              readOnly // Prevent editing
              className="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" // Updated styles
            />
          </div>

          {/* Password input */}
          <div className="mb-5">
            <label 
              htmlFor="password" 
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Create Your Password
            </label>
            <input
              type={showPassword ? "text" : "password"} // Toggle visibility
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              required
              autoComplete="current-password"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="text-sm text-blue-500 mt-1"
            >
              {showPassword ? "Hide Password" : "Show Password"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`text-white ${loading ? 'bg-gray-500' : 'bg-emerald-500 hover:bg-emerald-700'} focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5`}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Loading..</span>
              </>
            ) : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePassword;
