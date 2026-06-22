(function () {
    const loginPage = '/login.html';

    function redirectToLogin() {
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.replace(loginPage);
        }
    }

    if (localStorage.getItem('authenticated') !== 'true') {
        redirectToLogin();
    }
})();
