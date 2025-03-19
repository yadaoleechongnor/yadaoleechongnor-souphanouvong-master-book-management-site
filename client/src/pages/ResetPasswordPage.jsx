// ...existing code...

useEffect(() => {
  const verifyToken = async () => {
    try {
      console.log('Verifying token:', token); // Add logging
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/users/verify-token/${token}`);
      
      if (response.data.success) {
        setEmail(response.data.email);
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
        setError('Token verification failed');
      }
    } catch (error) {
      console.error('Token verification error details:', error);
      setIsTokenValid(false);
      if (error.response) {
        console.log('Error response:', error.response.data);
        setError(error.response.data.message || 'Token verification failed');
      } else {
        setError('Network error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  verifyToken();
}, [token]);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Password validation
  if (password.length < 8) {
    setError('Password must be at least 8 characters long');
    return;
  }
  
  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
  try {
    console.log('Submitting new password for token:', token); // Add logging
    setIsLoading(true);
    const response = await axios.post(`${API_URL}/users/reset-password/${token}`, {
      password
    });
    
    if (response.data.success) {
      setIsSuccess(true);
      setError('');
    } else {
      setError(response.data.message || 'Password reset failed');
    }
  } catch (error) {
    console.error('Password reset error details:', error);
    if (error.response) {
      console.log('Error response:', error.response.data);
      setError(error.response.data.message || 'Password reset failed');
    } else {
      setError('Network error. Please try again later.');
    }
  } finally {
    setIsLoading(false);
  }
};

// ...existing code...
