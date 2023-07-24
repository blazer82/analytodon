import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';

const AdminDashboardPage: React.FunctionComponent = () => {
    return (
        <Layout title="Dashboard">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}></Container>
        </Layout>
    );
};

export default AdminDashboardPage;
