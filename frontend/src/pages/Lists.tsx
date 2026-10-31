import { useQuery } from '@tanstack/react-query'
import CrudPage from '../components/CrudPage'
import { api } from '../services/api'

const useOpts = (ep: string) => useQuery({ queryKey: [ep, 'opt'], queryFn: async () => (await api.get(`/${ep}/`, { params: { page_size: 100 } })).data.results })

export const Branches = () => (
  <CrudPage title="Filiallar" endpoint="branches" canWrite={['owner', 'admin']}
    columns={[{ key: 'name', label: 'Nomi' }, { key: 'address', label: 'Manzil' }, { key: 'phone', label: 'Telefon' }, { key: 'feedback_count', label: 'Murojaatlar' }, { key: 'is_active', label: 'Faol', render: (r) => (r.is_active ? 'Ha' : 'Yo‘q') }]}
    fields={[{ name: 'name', label: 'Filial nomi', required: true }, { name: 'address', label: 'Manzil' }, { name: 'phone', label: 'Telefon' }, { name: 'is_active', label: 'Faol', type: 'checkbox' }]}
    defaults={{ is_active: true }} />
)

export function Departments() {
  const b = useOpts('branches')
  return (
    <CrudPage title="Bo‘limlar" endpoint="departments"
      columns={[{ key: 'name', label: 'Nomi' }, { key: 'branch_name', label: 'Filial' }]}
      fields={[{ name: 'name', label: 'Bo‘lim nomi', required: true }, { name: 'branch', label: 'Filial', type: 'select', options: (b.data || []).map((x: any) => ({ value: x.id, label: x.name })) }]} />
  )
}

export const Staff = () => (
  <CrudPage title="Xodimlar" endpoint="staff" canWrite={['owner', 'admin']} noEdit={false}
    columns={[{ key: 'full_name', label: 'Ism' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Telefon' }, { key: 'role', label: 'Rol' }]}
    fields={[
      { name: 'full_name', label: 'To‘liq ism', required: true, createOnly: true }, { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
      { name: 'phone', label: 'Telefon', createOnly: true }, { name: 'password', label: 'Parol (kamida 8)', type: 'password', required: true, createOnly: true },
      { name: 'role', label: 'Rol', type: 'select', required: true, options: [{ value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'employee', label: 'Employee' }] },
    ]} defaults={{ role: 'employee' }} />
)

export const Categories = () => (
  <CrudPage title="Kategoriyalar" endpoint="categories"
    columns={[{ key: 'name', label: 'Nomi' }, { key: 'kind', label: 'Turi' }, { key: 'is_active', label: 'Faol', render: (r) => (r.is_active ? 'Ha' : 'Yo‘q') }]}
    fields={[{ name: 'name', label: 'Nomi', required: true }, { name: 'kind', label: 'Turi', type: 'select', options: [{ value: 'both', label: 'Ikkalasi' }, { value: 'suggestion', label: 'Taklif' }, { value: 'complaint', label: 'Shikoyat' }] }, { name: 'is_active', label: 'Faol', type: 'checkbox' }]}
    defaults={{ kind: 'both', is_active: true }} />
)
