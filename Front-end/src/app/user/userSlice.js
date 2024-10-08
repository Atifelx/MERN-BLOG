import { createSlice } from '@reduxjs/toolkit'



//redux tool kit implementations 


const initialState = {
  currentUser:null,
  error:null,
  loading:false,
  userExist: false,
}

 const userSlice = createSlice({

  name: 'user',
  initialState,


  reducers: {

signinStart:(state)=>{
    state.loading = true;
    state.error=null;
},

signinSuccess:(state,action)=>{
    state.currentUser = action.payload;
    state.loading=false;
    state.error=null;
},
signinFailure:(state,action)=>{
    state.loading = false;
    state.error=action.payload;
},
 signout: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },

    GuserExist: (state,action) => {
      state.userExist = action.payload;;
    
    },
   
  }
});

export const { signinStart, signinSuccess, signinFailure ,signout, GuserExist} = userSlice.actions;

export const selectCurrentUser = (state) => state.user.currentUser; 

export default userSlice.reducer;

// userExist: (state, action) => {
//   state.userExist = action.payload; // Accept a payload
// },