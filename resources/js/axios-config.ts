import axios from 'axios'

// Configure axios to include CSRF token for Laravel web routes
// Get token from multiple sources: meta tag, Inertia props, or localStorage
function getCsrfToken(): string | null {
    // Try meta tag first
    let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (token) return token
    
    // Try localStorage (updated by Inertia)
    token = localStorage.getItem('csrf_token')
    if (token) return token
    
    return null
}

// Update CSRF token after each response (in case it was regenerated)
axios.interceptors.response.use(
    function (response) {
        // Check if response has new CSRF token (check both lowercase and original case)
        // Also check response.data if it's an Inertia response
        let newToken = response.headers['x-csrf-token'] || response.headers['X-CSRF-TOKEN']
        
        // Also check Inertia shared props if available
        if (!newToken && response.data && typeof response.data === 'object') {
            // Inertia responses might have CSRF in data
            if (response.data.csrf) {
                newToken = response.data.csrf
            }
        }
        
        if (newToken) {
            // Update meta tag
            const meta = document.querySelector('meta[name="csrf-token"]')
            if (meta) {
                meta.setAttribute('content', newToken)
            }
            localStorage.setItem('csrf_token', newToken)
        }
        return response
    },
    function (error) {
        // On 419 error, try to get fresh CSRF token without reloading page
        if (error.response?.status === 419) {
            // Try to get fresh token from meta tag (updated by Inertia after page loads)
            const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            if (freshToken && freshToken !== getCsrfToken()) {
                localStorage.setItem('csrf_token', freshToken)
                // Only retry once if it's not the same request that failed (prevent infinite loop)
                if (!error.config._retry) {
                    error.config._retry = true
                    error.config.headers['X-CSRF-TOKEN'] = freshToken
                    return axios.request(error.config)
                }
            }
            // If retry failed or no fresh token, show error but don't reload
            localStorage.removeItem('csrf_token')
        }
        return Promise.reject(error)
    }
)

// Use interceptor to get the token dynamically before each request
axios.interceptors.request.use(function (config) {
    const token = getCsrfToken()
    if (token) {
        config.headers['X-CSRF-TOKEN'] = token
    }
    return config
})

// Set default headers for all requests
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

// Include credentials for session-based auth
axios.defaults.withCredentials = true

export default axios

