import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import TicketModalView from './TicketModalView';

const TicketModal = (props) => {
  const { sale } = props;
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!sale?.cliente_id) { setCustomer(null); return; }
    axios.get(`${API}/customers/${sale.cliente_id}`)
      .then(r => setCustomer(r.data))
      .catch(() => setCustomer(null));
  }, [sale?.cliente_id]);

  return <TicketModalView {...props} customer={customer} />;
};

export default TicketModal;
