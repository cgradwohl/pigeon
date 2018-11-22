# An uptime monitor allows users to enter URLs they want to monitored, and receive alerts when the resources "come back up" or "go down". These alerts will come as SMS.

1. API listens on a port to GET POST DELETE HEAD

2. User can connect to APIS to create, edit, delete user.

3. Sign In via a token.

4. Sign Out, invalidates token.

5. Signed In user can use token "check" a url.

6. Signed In user can edit, delete checks limit 5.

7. Workers run in background process and once a minute sends alert up or down checks.