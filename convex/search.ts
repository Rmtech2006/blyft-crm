import { query } from './_generated/server'
import { v } from 'convex/values'

type SearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  section:
    | 'Clients'
    | 'Projects'
    | 'Tasks'
    | 'Leads'
    | 'Team'
    | 'Templates'
    | 'Finance'
    | 'Reimbursements'
}

function includesQuery(query: string, ...values: Array<string | undefined | null>) {
  return values.some((value) => value?.toLowerCase().includes(query))
}

function detailHref(section: 'clients' | 'projects' | 'tasks' | 'leads' | 'team', id: string) {
  return `/${section}/${encodeURIComponent(id)}`
}

export const global = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const search = args.query.trim().toLowerCase()
    if (search.length < 2) return [] as SearchResult[]

    const [
      clients,
      projects,
      tasks,
      leads,
      teamMembers,
      templates,
      transactions,
      reimbursements,
    ] = await Promise.all([
      ctx.db.query('clients').collect(),
      ctx.db.query('projects').collect(),
      ctx.db.query('tasks').collect(),
      ctx.db.query('leads').collect(),
      ctx.db.query('teamMembers').collect(),
      ctx.db.query('messageTemplates').collect(),
      ctx.db.query('transactions').collect(),
      ctx.db.query('reimbursements').collect(),
    ])

    const clientNameMap = new Map(clients.map((client) => [client._id, client.companyName]))
    const projectNameMap = new Map(projects.map((project) => [project._id, project.name]))
    const teamNameMap = new Map(teamMembers.map((member) => [member._id, member.fullName]))

    const results: SearchResult[] = []

    clients
      .filter((client) =>
        includesQuery(
          search,
          client.companyName,
          client.industry,
          client.website,
          client.status
        )
      )
      .slice(0, 5)
      .forEach((client) => {
        results.push({
          id: String(client._id),
          title: client.companyName,
          subtitle: [client.industry, client.status].filter(Boolean).join(' | '),
          href: detailHref('clients', String(client._id)),
          section: 'Clients',
        })
      })

    projects
      .filter((project) =>
        includesQuery(
          search,
          project.name,
          project.type,
          project.status,
          project.description,
          clientNameMap.get(project.clientId)
        )
      )
      .slice(0, 5)
      .forEach((project) => {
        results.push({
          id: String(project._id),
          title: project.name,
          subtitle: [clientNameMap.get(project.clientId), project.status].filter(Boolean).join(
            ' | '
          ),
          href: detailHref('projects', String(project._id)),
          section: 'Projects',
        })
      })

    tasks
      .filter((task) =>
        includesQuery(
          search,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.assigneeId ?? undefined,
          task.projectId ? projectNameMap.get(task.projectId) : undefined
        )
      )
      .slice(0, 5)
      .forEach((task) => {
        results.push({
          id: String(task._id),
          title: task.title,
          subtitle: [task.status, task.projectId ? projectNameMap.get(task.projectId) : undefined]
            .filter(Boolean)
            .join(' | '),
          href: detailHref('tasks', String(task._id)),
          section: 'Tasks',
        })
      })

    leads
      .filter((lead) =>
        includesQuery(
          search,
          lead.name,
          lead.company,
          lead.contactName,
          lead.email,
          lead.serviceType,
          lead.stage
        )
      )
      .slice(0, 5)
      .forEach((lead) => {
        results.push({
          id: String(lead._id),
          title: lead.name,
          subtitle: [lead.company, lead.stage].filter(Boolean).join(' | '),
          href: detailHref('leads', String(lead._id)),
          section: 'Leads',
        })
      })

    teamMembers
      .filter((member) =>
        includesQuery(
          search,
          member.fullName,
          member.email,
          member.department,
          member.type,
          member.status,
          member.skills.join(' ')
        )
      )
      .slice(0, 5)
      .forEach((member) => {
        results.push({
          id: String(member._id),
          title: member.fullName,
          subtitle: [member.department, member.status].filter(Boolean).join(' | '),
          href: detailHref('team', String(member._id)),
          section: 'Team',
        })
      })

    templates
      .filter((template) =>
        includesQuery(search, template.title, template.category, template.content)
      )
      .slice(0, 5)
      .forEach((template) => {
        results.push({
          id: String(template._id),
          title: template.title,
          subtitle: template.category.replace(/_/g, ' '),
          href: '/templates',
          section: 'Templates',
        })
      })

    transactions
      .filter((transaction) =>
        includesQuery(
          search,
          transaction.description,
          transaction.category,
          transaction.type,
          transaction.paymentMode,
          transaction.clientId ? clientNameMap.get(transaction.clientId) : undefined,
          transaction.projectId ? projectNameMap.get(transaction.projectId) : undefined
        )
      )
      .slice(0, 5)
      .forEach((transaction) => {
        results.push({
          id: String(transaction._id),
          title: transaction.description,
          subtitle: [transaction.category, transaction.type].filter(Boolean).join(' | '),
          href: '/finance',
          section: 'Finance',
        })
      })

    reimbursements
      .filter((item) =>
        includesQuery(
          search,
          item.description,
          item.category,
          item.status,
          item.teamMemberId ? teamNameMap.get(item.teamMemberId) : undefined
        )
      )
      .slice(0, 5)
      .forEach((item) => {
        results.push({
          id: String(item._id),
          title: item.description,
          subtitle: [item.category.replace(/_/g, ' '), item.status].filter(Boolean).join(' | '),
          href: '/reimbursements',
          section: 'Reimbursements',
        })
      })

    return results.slice(0, 30)
  },
})
